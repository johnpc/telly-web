// Android `PlayerTuning` on the web: a live TS stream is only let run once
// enough of it is buffered, and after a stall it waits for a longer runway
// before resuming instead of restarting on the first byte and underrunning
// again (which reads as continuous stutter). Thresholds follow Settings →
// Playback → Buffer size like the Android decision of 2026-09-22, scaled up
// for the web pipe (TLS proxy hop + JS demux + MSE appends add jitter that
// ExoPlayer on a Shield never sees): Small = 2 s start / 6 s after a stall,
// Medium 5 / 8, Large 8 / 12. Measured 2026-11-23: a 5–7 s runway absorbed
// every delivery dip of a 90 s live session that a 2 s runway did not.
import { bufferedAhead, bufferedToEnd, FillRate, type BufferThresholds } from './bufferRunway';
import { safePlay } from './videoElement';

export { bufferedAhead, bufferedToEnd, thresholdsFor, type BufferThresholds } from './bufferRunway';

// @stateMachine('Buffer gate')
/**
 * Starting(need) · Playing · Holding(need) · UserPaused. The gate pauses the
 * element itself while it holds (`holding` tells the engine this is not a
 * user pause) and plays it once the buffered runway reaches `need`. A start
 * on a pipe that merely trickles at ~1× is raised from the short start
 * runway to the resume runway first: it is the only moment the runway can be
 * built, so one wait up front replaces a stall a few seconds in.
 */
export type GateState =
  | { kind: 'Starting'; need: number }
  | { kind: 'Playing' }
  | { kind: 'Holding'; need: number }
  | { kind: 'UserPaused' };

/** A `waiting` before this much has actually played is start-up jitter, not an underrun. */
const SETTLED_SEC = 1;

export class BufferGate {
  private state: GateState;
  private ownPause = false;
  private playStartedAt = 0;
  private readonly fill: FillRate;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly thresholds: BufferThresholds,
    now?: () => number,
  ) {
    this.state = { kind: 'Starting', need: thresholds.startAheadSec };
    this.fill = new FillRate(now);
  }

  get current(): GateState {
    return this.state;
  }

  /** True while the gate (not the user) keeps the element paused. */
  get holding(): boolean {
    return this.state.kind !== 'Playing' && this.state.kind !== 'UserPaused';
  }

  /** `play`: a user play while paused, or the engine's first start — held until the runway exists. */
  onPlay(): void {
    if (this.state.kind === 'UserPaused') {
      this.state = { kind: 'Starting', need: this.thresholds.startAheadSec };
      this.fill.reset();
    }
    this.check();
  }

  /** `pause` not issued by the gate = the user's. */
  onPause(): void {
    if (this.ownPause) this.ownPause = false;
    else this.state = { kind: 'UserPaused' };
  }

  /**
   * `waiting` while playing. Browsers fire it spuriously as playback starts; only
   * a stall after real playback is an underrun worth the long resume runway —
   * an early one re-arms the (shorter) start runway instead.
   */
  onWaiting(): void {
    if (this.state.kind !== 'Playing') return;
    const settled = this.video.currentTime - this.playStartedAt >= SETTLED_SEC;
    const need = settled ? this.thresholds.resumeAheadSec : this.thresholds.startAheadSec;
    this.hold({ kind: 'Holding', need });
  }

  /** `progress` / `timeupdate`: enough runway lets a held element go. */
  onProgress(): void {
    this.check();
  }

  private check(): void {
    const s = this.state;
    if (s.kind !== 'Starting' && s.kind !== 'Holding') return;
    const next = this.nextNeed(s);
    if (next !== null) return this.hold({ kind: s.kind, need: next });
    this.state = { kind: 'Playing' };
    this.playStartedAt = this.video.currentTime;
    safePlay(this.video);
  }

  /** The runway a held element still has to reach, or null when it may play now. */
  private nextNeed(s: { kind: 'Starting' | 'Holding'; need: number }): number | null {
    const ahead = bufferedAhead(this.video);
    if (bufferedToEnd(this.video)) return null;
    if (ahead < s.need) return s.need;
    return s.kind === 'Starting' && this.trickles(s.need, ahead) ? this.thresholds.resumeAheadSec : null;
  }

  /** A short start runway only survives on a pipe that bursts; a ~1× pipe gets the resume runway before the first frame. */
  private trickles(need: number, ahead: number): boolean {
    return need < this.thresholds.resumeAheadSec && !this.fill.bursting(ahead);
  }

  private hold(next: GateState): void {
    this.state = next;
    if (!this.video.paused) {
      this.ownPause = true;
      this.video.pause();
    }
  }
}

/** Wires a gate to the element's events; the returned function unwires it. */
export function attachBufferGate(
  video: HTMLVideoElement,
  thresholds: BufferThresholds,
): { gate: BufferGate; detach: () => void } {
  const gate = new BufferGate(video, thresholds);
  const bindings: [string, () => void][] = [
    ['play', () => gate.onPlay()],
    ['pause', () => gate.onPause()],
    ['waiting', () => gate.onWaiting()],
    ['progress', () => gate.onProgress()],
    ['timeupdate', () => gate.onProgress()],
  ];
  for (const [event, handler] of bindings) video.addEventListener(event, handler);
  return {
    gate,
    detach: () => bindings.forEach(([event, handler]) => video.removeEventListener(event, handler)),
  };
}
