import type { RecordingRow } from '@/core/db/types';
import type { StreamConcurrency } from '@/core/player';
import { type AttemptsOutcome, runAttempts } from './captureAttempts';
import { type Capture, countingSink, defaultFetch, warnAttempt } from './captureContext';
import type { RecordingFiles } from './recordingFiles';
import type { RecordingStore } from './recordingStore';
import { RECORDING_LIMIT_REASON } from './recordingStatus';
import { complete, fail, markStarted, markStopping } from './recordingStoreTransitions';
import { type FetchLike, type StreamRecorder, recordStream } from './streamRecorder';

export interface RecordingEngineDeps {
  store: RecordingStore;
  files: RecordingFiles;
  clock: () => number;
  recorder?: StreamRecorder;
  fetch?: FetchLike;
  /** Pause between copy attempts (a live source dropped and may resume). */
  retryDelayMs?: number;
  /** How often the growing `sizeBytes` is written back to the row. */
  sizeUpdateMs?: number;
  /** The `Provider stream limit` registry shared with the engines; default the app's one instance. */
  concurrency?: StreamConcurrency | undefined;
}

/**
 * Runs the actual captures (Android `RecordingEngine`): one copy loop per
 * active recording, re-connecting when a live source drops, finishing the
 * row as DONE (planned end reached or user stop) or FAILED (three attempts
 * in a row wrote nothing, a fetch error with nothing on disk, or the
 * provider's one-stream line refused the capture — then the slate it sent is
 * not kept and the row says why). The injected clock is the only time source.
 */
export class RecordingEngine {
  private readonly active = new Map<number, Capture>();

  constructor(private readonly deps: RecordingEngineDeps) {}

  isActive(id: number): boolean {
    return this.active.has(id);
  }

  /** Begins capturing `row` (idempotent per row id). */
  start(row: RecordingRow): void {
    if (this.active.has(row.id)) return;
    const capture: Capture = {
      id: row.id,
      plannedEndMs: row.plannedEndMs,
      controller: new AbortController(),
      stopped: false,
      bytes: 0,
      done: Promise.resolve(),
    };
    this.active.set(row.id, capture);
    capture.done = this.run(row, capture).finally(() => this.active.delete(row.id));
  }

  /** User stop: ends the copy loop and waits for the row to finalize. */
  async stop(id: number): Promise<void> {
    const capture = this.active.get(id);
    if (capture === undefined) return;
    await markStopping(this.deps.store, id);
    capture.stopped = true;
    capture.controller.abort();
    await capture.done;
  }

  /** Resolves once `id` is no longer being written (immediately when it is not active). */
  whenSettled(id: number): Promise<void> {
    return this.active.get(id)?.done ?? Promise.resolve();
  }

  /** App start: rows stuck RECORDING from a closed tab finalize now. */
  async recoverStale(): Promise<void> {
    for (const row of await this.deps.store.allRecording()) {
      if (!this.active.has(row.id)) await this.finish(row);
    }
  }

  private async run(row: RecordingRow, capture: Capture): Promise<void> {
    // A row cancelled or deleted between the scheduler's sweep and this
    // launch is no longer SCHEDULED: nothing to record, nothing to finish.
    if (!(await markStarted(this.deps.store, row.id))) return;
    const endTimer = setTimeout(
      () => capture.controller.abort(),
      Math.max(0, row.plannedEndMs - this.deps.clock()),
    );
    let outcome: AttemptsOutcome = 'Completed';
    try {
      outcome = await this.copyLoop(row, capture);
    } catch (error: unknown) {
      // No OPFS (or the file could not be opened): the row fails from what is on disk.
      warnAttempt(row, capture, error);
    } finally {
      clearTimeout(endTimer);
      await this.finish(row, outcome);
    }
  }

  /** Opens the capture file, runs the attempts, and closes the file whatever happened. */
  private async copyLoop(row: RecordingRow, capture: Capture): Promise<AttemptsOutcome> {
    const { store, clock } = this.deps;
    const writable = await this.deps.files.open(row.filePath);
    const report = (bytes: number): void => void store.updateSize(row.id, bytes);
    const sink = countingSink(capture, writable, report, clock, this.deps.sizeUpdateMs ?? 1_000);
    try {
      return await runAttempts(row.streamUrl, capture, sink, {
        clock,
        fetch: this.deps.fetch ?? defaultFetch,
        recorder: this.deps.recorder ?? recordStream,
        retryDelayMs: this.deps.retryDelayMs ?? 1_000,
        onError: (error) => warnAttempt(row, capture, error),
        concurrency: this.deps.concurrency,
      });
    } finally {
      await writable.close();
    }
  }

  /** DONE when bytes landed on disk, FAILED otherwise; a refused capture keeps no slate file and says why. */
  private async finish(row: RecordingRow, outcome: AttemptsOutcome = 'Completed'): Promise<void> {
    if (outcome === 'Limited') await this.deps.files.delete(row.filePath);
    const size = await this.deps.files.sizeOf(row.filePath);
    if (size > 0) await complete(this.deps.store, row.id, size);
    else await fail(this.deps.store, row.id, size, outcome === 'Limited' ? RECORDING_LIMIT_REASON : null);
  }
}
