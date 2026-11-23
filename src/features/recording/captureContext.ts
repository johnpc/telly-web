import type { RecordingWritable } from './recordingFiles';
import type { CaptureContext, CaptureSink, FetchLike } from './streamRecorder';

/** One running capture's mutable bookkeeping (Android `RecordingEngine.Active`). */
export interface Capture {
  readonly id: number;
  readonly plannedEndMs: number;
  readonly controller: AbortController;
  stopped: boolean;
  bytes: number;
  /** Resolves once the row has been finalized (DONE / FAILED). */
  done: Promise<void>;
}

/** Waits `ms`, resolving early the moment `signal` aborts. */
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish);
  });
}

/** A sink that appends to the OPFS writable, counts bytes and reports the growing size (throttled). */
export function countingSink(
  capture: Capture,
  writable: RecordingWritable,
  report: (bytes: number) => void,
  clock: () => number,
  throttleMs: number,
): CaptureSink {
  let lastReport = clock();
  return {
    async write(chunk) {
      await writable.write(chunk);
      capture.bytes += chunk.byteLength;
      const now = clock();
      if (now - lastReport >= throttleMs) {
        lastReport = now;
        report(capture.bytes);
      }
    },
  };
}

/** The attempt's view of the capture: stop on user stop or the planned end; every wait/fetch is abortable. */
export function captureContext(capture: Capture, clock: () => number, fetchImpl: FetchLike): CaptureContext {
  const { signal } = capture.controller;
  return {
    fetch: fetchImpl,
    signal,
    shouldStop: () => capture.stopped || clock() >= capture.plannedEndMs,
    delay: (ms) => abortableDelay(ms, signal),
  };
}

export const defaultFetch: FetchLike = (input, init) => fetch(input, init);
