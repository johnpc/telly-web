// @stateMachine('Stall detector')
//
// Detects a silently wedged stream from periodic playback samples — the
// failure auto-reconnect cannot see because no error event ever fires: the
// position freezing while the element still claims to be playing (dead MSE
// pipeline / stalled source), or a buffering state that never resolves.
// Port of Android's `StallDetector`: the watchdog owns the sampling cadence,
// so the thresholds are consecutive tick counts, not wall time.
import type { EngineStateKind } from './engineState';

/** Consecutive 2 s samples with zero movement while "playing" (~10 s). */
export const FROZEN_TICKS = 5;

/**
 * Consecutive 2 s samples stuck buffering (~30 s — past the deepest reconnect
 * backoff, so a recovering stream is never double-kicked).
 */
export const BUFFERING_TICKS = 15;

export type StallMode =
  { kind: 'Healthy' } | { kind: 'FrozenRun'; run: number } | { kind: 'BufferingRun'; run: number };

/** One watchdog sample: engine state kind + what the `<video>` reports. */
export interface StallSample {
  state: EngineStateKind;
  /** `!video.paused` — a user pause is never a stall. */
  playWhenReady: boolean;
  /** `video.currentTime` in whole ms. */
  positionMs: number;
}

type ModeKind = StallMode['kind'];

export class StallDetector {
  private current: ModeKind = 'Healthy';
  private run = 0;
  private lastPositionMs = Number.MIN_SAFE_INTEGER;

  constructor(
    private readonly frozenTicks: number = FROZEN_TICKS,
    private readonly bufferingTicks: number = BUFFERING_TICKS,
  ) {}

  get mode(): StallMode {
    if (this.current === 'Healthy') return { kind: 'Healthy' };
    return { kind: this.current, run: this.run };
  }

  /** Feeds one sample; true = wedged, recover now (the count restarts). */
  onSample(sample: StallSample): boolean {
    const next = this.modeOf(sample);
    this.run = next === this.current ? this.run + 1 : 1;
    this.current = next;
    this.lastPositionMs = sample.positionMs;
    const wedged = this.run >= this.limitOf(next);
    if (wedged) this.run = 0;
    return wedged;
  }

  private limitOf(mode: ModeKind): number {
    if (mode === 'FrozenRun') return this.frozenTicks;
    if (mode === 'BufferingRun') return this.bufferingTicks;
    return Number.POSITIVE_INFINITY;
  }

  /** A user pause is never a stall; reconnecting runs its own budget. */
  private modeOf(sample: StallSample): ModeKind {
    if (!sample.playWhenReady) return 'Healthy';
    if (sample.state === 'Buffering') return 'BufferingRun';
    if (sample.state === 'Playing' && sample.positionMs === this.lastPositionMs) return 'FrozenRun';
    return 'Healthy';
  }
}
