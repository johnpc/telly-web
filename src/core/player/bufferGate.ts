// Android `PlayerTuning` on the web: a live TS stream is only let run once
// enough of it is buffered, and after a stall it waits for a longer runway
// before resuming instead of restarting on the first byte and underrunning
// again (which reads as continuous stutter). Thresholds follow Settings →
// Playback → Buffer size exactly like the Android decision of 2026-09-22
// (Small = 1.5 s start / 5 s after a stall; Medium 2.5 / 5; Large 2.5 / 10).
import { safePlay } from './videoElement';

export interface BufferThresholds {
  /** Seconds buffered ahead before the first frame plays. */
  startAheadSec: number;
  /** Seconds buffered ahead before playback resumes after a stall. */
  resumeAheadSec: number;
}

const THRESHOLDS: Readonly<Record<string, BufferThresholds>> = {
  Small: { startAheadSec: 1.5, resumeAheadSec: 5 },
  Medium: { startAheadSec: 2.5, resumeAheadSec: 5 },
  Large: { startAheadSec: 2.5, resumeAheadSec: 10 },
};

export function thresholdsFor(bufferSize: string): BufferThresholds {
  return THRESHOLDS[bufferSize] ?? THRESHOLDS['Small'] ?? { startAheadSec: 1.5, resumeAheadSec: 5 };
}

// @stateMachine('Buffer gate')
/**
 * Starting(need) · Playing · Holding(need) · UserPaused. The gate pauses the
 * element itself while it holds (`holding` tells the engine this is not a
 * user pause) and plays it once the buffered runway reaches `need`.
 */
export type GateState =
  | { kind: 'Starting'; need: number }
  | { kind: 'Playing' }
  | { kind: 'Holding'; need: number }
  | { kind: 'UserPaused' };

/** Seconds of media buffered beyond the playhead. */
export function bufferedAhead(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  for (let i = buffered.length - 1; i >= 0; i -= 1) {
    if (buffered.start(i) <= currentTime + 0.25) return Math.max(0, buffered.end(i) - currentTime);
  }
  return 0;
}

export class BufferGate {
  private state: GateState;
  private ownPause = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly thresholds: BufferThresholds,
  ) {
    this.state = { kind: 'Starting', need: thresholds.startAheadSec };
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
    if (this.state.kind === 'UserPaused')
      this.state = { kind: 'Starting', need: this.thresholds.startAheadSec };
    this.check();
  }

  /** `pause` not issued by the gate = the user's. */
  onPause(): void {
    if (this.ownPause) this.ownPause = false;
    else this.state = { kind: 'UserPaused' };
  }

  /** `waiting` while playing: a real underrun — hold for the longer runway. */
  onWaiting(): void {
    if (this.state.kind === 'Playing') this.hold({ kind: 'Holding', need: this.thresholds.resumeAheadSec });
  }

  /** `progress` / `timeupdate`: enough runway lets a held element go. */
  onProgress(): void {
    this.check();
  }

  private check(): void {
    const s = this.state;
    if (s.kind !== 'Starting' && s.kind !== 'Holding') return;
    if (bufferedAhead(this.video) < s.need) return this.hold(s);
    this.state = { kind: 'Playing' };
    safePlay(this.video);
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
