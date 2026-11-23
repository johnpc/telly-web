import { recordHls, type HlsProgress } from './hlsRecorder';
import { recordProgressive } from './progressiveRecorder';

/** Where a capture attempt appends bytes (a counting wrapper over the OPFS writable). */
export interface CaptureSink {
  write(chunk: Uint8Array<ArrayBuffer>): Promise<void>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** What one copy attempt may read from its surroundings; every wait and fetch honours the stop. */
export interface CaptureContext {
  fetch: FetchLike;
  /** Aborted by a user stop or the planned end: unblocks an in-flight fetch at once. */
  signal: AbortSignal;
  /** Checked between chunks / segments / polls. */
  shouldStop(): boolean;
  /** Waits `ms`, resolving early when the capture stops. */
  delay(ms: number): Promise<void>;
}

/**
 * One copy attempt: streams `url` into `sink` until the source ends or the
 * capture stops; returns the bytes written by THIS attempt. The engine loops
 * attempts (live sources drop and resume), so recorders never retry.
 */
export type StreamRecorder = (
  url: string,
  sink: CaptureSink,
  ctx: CaptureContext,
  progress: HlsProgress,
) => Promise<number>;

/** Instant record without EPG runs for 3 h (recording-slice spec). */
export const FALLBACK_DURATION_MS = 3 * 60 * 60_000;

/** True when `streamUrl` is an HLS playlist the segment recorder owns. */
export function isHls(streamUrl: string): boolean {
  const path = (streamUrl.split(/[?#]/)[0] ?? '').toLowerCase();
  return path.endsWith('.m3u8');
}

/** `.m3u8` sources go to the segment-appending recorder, everything else is byte-copied (Android `RoutingStreamRecorder`). */
export const recordStream: StreamRecorder = (url, sink, ctx, progress) =>
  isHls(url) ? recordHls(url, sink, ctx, progress) : recordProgressive(url, sink, ctx);

/** Fresh dedupe state for one capture file. */
export function newHlsProgress(): HlsProgress {
  return { lastSequence: -1, initWritten: false };
}
