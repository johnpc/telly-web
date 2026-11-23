import { keyOf } from '@/core/db/channelIdentity';
import type { RecordingImport } from '@/core/db/recordingRepository';
import { type ChannelRow, type RecordingRow, displayName, epgId } from '@/core/db/types';
import type { RecordingEngine } from './recordingEngine';
import type { RecordingFiles } from './recordingFiles';
import type { RecordingPrompt } from './recordingPrompt';
import type { RecordingScheduler } from './recordingScheduler';
import type { RecordingStore } from './recordingStore';
import { FALLBACK_DURATION_MS } from './streamRecorder';

/** The airing programme a Record action derives its title/end from. */
export interface RecordingProgramme {
  title: string;
  endMs: number;
}

/** EPG lookup seam: the programme airing on `epgId` at `atMs`, if known. */
export type RecordingProgrammes = (epgId: string, atMs: number) => Promise<RecordingProgramme | null>;

export interface RecordingCenterDeps {
  store: RecordingStore;
  engine: RecordingEngine;
  scheduler: RecordingScheduler;
  files: RecordingFiles;
  programmes: RecordingProgrammes;
  clock: () => number;
  /** Capture extension for a stream (`ts` / `mp4`); probed once at schedule time. */
  extensionOf: (streamUrl: string) => Promise<string>;
}

/**
 * The DVR facade every surface talks to (Android `RecordingCenter`): instant
 * record (until the EPG end or the 3 h fallback), scheduled programme/custom
 * recordings, stop / delete, and the storage numbers for the settings pane.
 */
export class RecordingCenter {
  constructor(private readonly deps: RecordingCenterDeps) {}

  /** The library list, newest start first. */
  recordings(): Promise<RecordingRow[]> {
    return this.deps.store.all();
  }

  /** App start: finalize stale rows, then watch the schedule; the result stops the watch. */
  async start(): Promise<() => void> {
    await this.deps.engine.recoverStale();
    return this.deps.scheduler.start();
  }

  /** Record on a channel: start now, or offer Stop while it records. */
  async toggleInstant(channel: ChannelRow): Promise<RecordingPrompt> {
    const active = await this.deps.store.activeFor(keyOf(channel));
    if (active !== null) {
      return { kind: 'StopConfirm', recordingId: active.id, channelName: displayName(channel) };
    }
    const now = this.deps.clock();
    const id = epgId(channel);
    const airing = id === null ? null : await this.deps.programmes(id, now);
    const row = await this.deps.store.schedule(
      await this.newEntry(channel, airing?.title ?? null, now, airing?.endMs ?? now + FALLBACK_DURATION_MS),
    );
    if (row !== null) this.deps.engine.start(row);
    return { kind: 'Done' };
  }

  /** Guide-cell Record on a future programme: one scheduled entry per slot. */
  async scheduleProgramme(
    channel: ChannelRow,
    title: string | null,
    startMs: number,
    endMs: number,
  ): Promise<RecordingPrompt> {
    await this.deps.store.schedule(await this.newEntry(channel, title, startMs, endMs));
    return { kind: 'Done' };
  }

  /** Stops an in-progress capture; the entry stays as DONE. */
  stop(recordingId: number): Promise<void> {
    return this.deps.engine.stop(recordingId);
  }

  /** Resolves once the capture file is closed (immediately when it is not being written). */
  whenSettled(recordingId: number): Promise<void> {
    return this.deps.engine.whenSettled(recordingId);
  }

  /** The capture file for playback, or null when it is gone. */
  async blobOf(row: RecordingRow): Promise<Blob | null> {
    return this.deps.files.blobOf(row.filePath);
  }

  /** Removes an entry: stops it first if live, then drops row + file. */
  async delete(recordingId: number): Promise<void> {
    const entry = await this.deps.store.byId(recordingId);
    if (entry === null) return;
    await this.deps.engine.stop(recordingId);
    await this.deps.store.remove(recordingId);
    await this.deps.files.delete(entry.filePath);
  }

  /** Settings pane: drops every row and every capture file. */
  async deleteAll(): Promise<void> {
    for (const row of await this.deps.store.allRecording()) await this.deps.engine.stop(row.id);
    await this.deps.store.removeAll();
    await this.deps.files.deleteAllFiles();
  }

  private async newEntry(
    channel: ChannelRow,
    title: string | null,
    startMs: number,
    endMs: number,
  ): Promise<RecordingImport> {
    const name = displayName(channel);
    const extension = await this.deps.extensionOf(channel.streamUrl);
    return {
      channelKey: keyOf(channel),
      channelName: name,
      streamUrl: channel.streamUrl,
      title: title ?? name,
      filePath: await this.deps.files.newFileName(name, startMs, extension),
      startMs,
      plannedEndMs: endMs,
      endMs: null,
      status: 'SCHEDULED',
      sizeBytes: 0,
    };
  }
}
