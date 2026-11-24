// Android `PlayerTuning` on the web: a live TS stream is only let run once
// enough of it is buffered, and after a stall it waits for the same runway
// before resuming instead of restarting on the first byte and underrunning
// again (which reads as continuous stutter). The runway follows Settings →
// Playback → Buffer size (Small 6 s, Medium 8 s, Large 12 s — see
// ./bufferRunway.ts for why there is one runway, not a short start one).
// Measured 2026-11-23 on a real provider through the TLS relay: 0 rebuffers,
// 0 dropped frames over 90 s with a 6 s runway; a 2 s start runway stalled.
import { runwayReady, type BufferThresholds } from './bufferRunway';
import { safePlay } from './videoElement';

export { bufferedAhead, bufferedToEnd, thresholdsFor, type BufferThresholds } from './bufferRunway';

// @stateMachine('Buffer gate')
/**
 * Starting · Playing · Holding · UserPaused. The gate pauses the element
 * itself while it holds (`holding` tells the engine this is not a user pause)
 * and plays it once the buffered runway is there.
 */
export type GateState =
  { kind: 'Starting' } | { kind: 'Playing' } | { kind: 'Holding' } | { kind: 'UserPaused' };

export class BufferGate {
  private state: GateState = { kind: 'Starting' };
  private ownPause = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly thresholds: BufferThresholds,
  ) {}

  get current(): GateState {
    return this.state;
  }

  /** True while the gate (not the user) keeps the element paused. */
  get holding(): boolean {
    return this.state.kind !== 'Playing' && this.state.kind !== 'UserPaused';
  }

  /** `play`: a user play while paused, or the engine's first start — held until the runway exists. */
  onPlay(): void {
    if (this.state.kind === 'UserPaused') this.state = { kind: 'Starting' };
    this.check();
  }

  /** `pause` not issued by the gate = the user's. */
  onPause(): void {
    if (this.ownPause) this.ownPause = false;
    else this.state = { kind: 'UserPaused' };
  }

  /** `waiting` while playing: an underrun — hold until the runway is back. */
  onWaiting(): void {
    if (this.state.kind === 'Playing') this.hold({ kind: 'Holding' });
  }

  /** `progress` / `timeupdate`: enough runway lets a held element go. */
  onProgress(): void {
    this.check();
  }

  private check(): void {
    const s = this.state;
    if (s.kind !== 'Starting' && s.kind !== 'Holding') return;
    if (!runwayReady(this.video, this.thresholds)) return this.hold(s);
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
