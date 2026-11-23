import { type Capture, captureContext } from './captureContext';
import type { HlsProgress } from './hlsRecorder';
import {
  type CaptureContext,
  type CaptureSink,
  type FetchLike,
  type StreamRecorder,
  newHlsProgress,
} from './streamRecorder';

/** Three attempts in a row that wrote nothing give the capture up (Android `MAX_IDLE_ATTEMPTS`). */
export const MAX_IDLE_ATTEMPTS = 3;

export interface AttemptDeps {
  clock: () => number;
  fetch: FetchLike;
  recorder: StreamRecorder;
  /** Pause between copy attempts (a live source dropped and may resume). */
  retryDelayMs: number;
  /** A failed attempt's error (a stop-aborted fetch is reported too; the engine filters it). */
  onError: (error: unknown) => void;
}

/**
 * The copy loop of one capture: attempts run until a user stop, the planned
 * end, or `MAX_IDLE_ATTEMPTS` idle attempts in a row; a connection error
 * counts as idle. The between-attempts pause is cut short the moment a stop
 * lands, so the row never lingers in RECORDING after Stop was confirmed.
 */
export async function runAttempts(
  url: string,
  capture: Capture,
  sink: CaptureSink,
  deps: AttemptDeps,
): Promise<void> {
  const ctx = captureContext(capture, deps.clock, deps.fetch);
  const progress = newHlsProgress();
  let idle = 0;
  while (canContinue(ctx, idle)) {
    idle = (await attempt(url, capture, sink, ctx, progress, deps)) ? 0 : idle + 1;
    if (canContinue(ctx, idle)) await ctx.delay(deps.retryDelayMs);
  }
}

/** Another attempt is worth it while nothing stopped the capture and the source still produced bytes recently. */
function canContinue(ctx: CaptureContext, idle: number): boolean {
  return !ctx.shouldStop() && idle < MAX_IDLE_ATTEMPTS;
}

/** One attempt; true when it wrote bytes. */
async function attempt(
  url: string,
  capture: Capture,
  sink: CaptureSink,
  ctx: CaptureContext,
  progress: HlsProgress,
  deps: AttemptDeps,
): Promise<boolean> {
  const before = capture.bytes;
  await deps.recorder(url, sink, ctx, progress).catch(deps.onError);
  return capture.bytes > before;
}
