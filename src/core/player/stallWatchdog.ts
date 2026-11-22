// Samples playback every TICK_MS through the engine's ticker seam and asks
// `StallDetector` whether the stream is silently wedged (frozen frame or
// never-ending buffering with no error event). `onStall` then recovers
// exactly like a dropped stream — the fix that used to require backing out
// of the player and tuning again by hand. Port of Android's
// `EngineStallWatchdog`; the ticker is injectable so tests drive ticks.
import type { EngineState } from './engineState';
import type { StallDetector, StallSample } from './stallDetector';
import { positionMsOf } from './videoElement';

/** 2 s sampling: frozen video recovers in ~10 s, wedged buffering in ~30 s. */
export const TICK_MS = 2_000;

/** Starts a repeating tick; the returned function cancels it. */
export type Ticker = (intervalMs: number, tick: () => void) => () => void;

export const intervalTicker: Ticker = (intervalMs, tick) => {
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
};

/** What one tick reads off the element for the detector. */
export function sampleOf(video: HTMLVideoElement, state: EngineState): StallSample {
  return { state: state.kind, playWhenReady: !video.paused, positionMs: positionMsOf(video) };
}

export class StallWatchdog {
  private cancel: (() => void) | null = null;

  constructor(
    private readonly detector: StallDetector,
    private readonly ticker: Ticker,
    private readonly read: () => StallSample,
    private readonly onStall: () => void,
    /** Each sample also feeds the playback telemetry (frozen-video check). */
    private readonly onSample: () => void = () => undefined,
  ) {}

  get running(): boolean {
    return this.cancel !== null;
  }

  start(): void {
    if (this.cancel !== null) return;
    this.cancel = this.ticker(TICK_MS, () => this.tick());
  }

  /** Engine release: the periodic sampling must not outlive the player. */
  stop(): void {
    this.cancel?.();
    this.cancel = null;
  }

  private tick(): void {
    this.onSample();
    if (this.detector.onSample(this.read())) this.onStall();
  }
}
