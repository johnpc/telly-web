import { type StreamConcurrency, type StreamEnd, type StreamHandle, streamConcurrency } from '@/core/player';
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

/** How the copy loop ended: on its own terms, or refused by the provider's one-stream line. */
export type AttemptsOutcome = 'Completed' | 'Limited';

type AttemptResult = 'Wrote' | 'Idle' | 'Limited';

export interface AttemptDeps {
  clock: () => number;
  fetch: FetchLike;
  recorder: StreamRecorder;
  /** Pause between copy attempts (a live source dropped and may resume). */
  retryDelayMs: number;
  /** A failed attempt's error (a stop-aborted fetch is reported too; the engine filters it). */
  onError: (error: unknown) => void;
  /** The `Provider stream limit` registry shared with the engines; default the app's one instance. */
  concurrency?: StreamConcurrency | undefined;
}

/**
 * The copy loop of one capture: attempts run until a user stop, the planned
 * end, `MAX_IDLE_ATTEMPTS` idle attempts in a row (a connection error counts
 * as idle), or the provider's one-stream line refuses the capture — a live
 * pipe that ends inside the slate window while another live stream from the
 * same host is open, or a host already known to be Limited while one is. The
 * between-attempts pause is cut short the moment a stop lands.
 */
export async function runAttempts(
  url: string,
  capture: Capture,
  sink: CaptureSink,
  deps: AttemptDeps,
): Promise<AttemptsOutcome> {
  const registry = deps.concurrency ?? streamConcurrency;
  if (registry.wouldExceed(url)) return 'Limited';
  const ctx = captureContext(capture, deps.clock, deps.fetch);
  const progress = newHlsProgress();
  let idle = 0;
  while (canContinue(ctx, idle)) {
    const result = await attempt(url, capture, sink, ctx, progress, deps, registry);
    if (result === 'Limited') return 'Limited';
    idle = result === 'Wrote' ? 0 : idle + 1;
    if (canContinue(ctx, idle)) await ctx.delay(deps.retryDelayMs);
  }
  return 'Completed';
}

/** Another attempt is worth it while nothing stopped the capture and the source still produced bytes recently. */
function canContinue(ctx: CaptureContext, idle: number): boolean {
  return !ctx.shouldStop() && idle < MAX_IDLE_ATTEMPTS;
}

/** One attempt, registered as a stream from its first response; Limited when its end proved the one-stream line. */
async function attempt(
  url: string,
  capture: Capture,
  sink: CaptureSink,
  ctx: CaptureContext,
  progress: HlsProgress,
  deps: AttemptDeps,
  registry: StreamConcurrency,
): Promise<AttemptResult> {
  const before = capture.bytes;
  const watched = watchStream(url, ctx, registry);
  const end = await deps.recorder(url, sink, watched.ctx, progress).then(
    (): StreamEnd => 'Ended',
    (error: unknown): StreamEnd => {
      deps.onError(error);
      return 'Error';
    },
  );
  if (watched.close(end)) return 'Limited';
  return capture.bytes > before ? 'Wrote' : 'Idle';
}

interface WatchedStream {
  ctx: CaptureContext;
  close(end: StreamEnd): boolean;
}

/** The attempt's context with its fetch watched, so the capture registers as a stream from its first response. */
function watchStream(url: string, ctx: CaptureContext, registry: StreamConcurrency): WatchedStream {
  let handle: StreamHandle | null = null;
  const fetch: FetchLike = async (input, init) => {
    const response = await ctx.fetch(input, init);
    handle ??= registerStream(url, input, response, registry);
    return response;
  };
  return { ctx: { ...ctx, fetch }, close: (end) => handle?.close(end) ?? false };
}

/**
 * Only the capture's own URL registers (a playlist's segments never do), live
 * only when the server streams it without a length — the engine's `isLivePipe`
 * rule, so a finite file or an HLS playlist can never be a refused stream.
 */
function registerStream(
  url: string,
  input: string,
  response: Response,
  registry: StreamConcurrency,
): StreamHandle | null {
  if (input !== url) return null;
  return registry.open(url, response.headers.get('content-length') === null);
}
