import type { SimpleRemoteKey } from '@/core/input/remoteKeys';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import { ArmedArchive } from './catchupArmed';
import { CatchupPause, keyHostOf, routeCatchupKey } from './catchupControls';
import { CatchupNeighbours } from './catchupNeighbours';
import { PositionStore } from './catchupPosition';
import { CatchupProgrammeHop } from './catchupProgrammeHop';
import { type CatchupRequest, type CatchupState, NO_SEEK, durationOf } from './catchupSession';
import type { CatchupPlaybackDeps } from './catchupDeps';
import type { CatchupSkip } from './skipSteps';

/**
 * Catch-up playback mode inside the fullscreen player (Android
 * `CatchupPlayback`): Off · Playing(request, fromLive, seek). Consumes the guide's
 * pending request, owns the seek keys (honouring the Remote-control
 * toggles), the transport's pause and programme hops, tracks the position
 * for the transport, and leaves the mode on BACK (to live when entered from
 * live, else to the guide) or when the finished archive returns to live
 * playback of the same channel (engine `Ended`).
 *
 * The mode itself is DERIVED from the tuner's `TunedStream`: catch-up is on
 * exactly while the tuner plays the archive this class armed. So a
 * PIN-gated archive tune is not catch-up until the verified PIN replays it,
 * and ANY live tune — zap, panel row, recents, Hide channel's zap-away —
 * leaves the mode without anyone having to remember to say so.
 */
// @stateMachine('Catch-up mode')
export class CatchupPlayback {
  readonly position = new PositionStore();
  readonly pause: CatchupPause;
  readonly hop: CatchupProgrammeHop;
  private readonly armed = new ArmedArchive();

  constructor(readonly deps: CatchupPlaybackDeps) {
    this.pause = new CatchupPause(
      deps.engine,
      () => this.state !== null,
      deps.showTransport,
      deps.pinTransport,
    );
    this.hop = new CatchupProgrammeHop(new CatchupNeighbours(deps.epg, deps.clock), deps.epg, {
      active: () => this.state,
      enter: (request, fromLive) => this.enter(request, fromLive),
      toLive: () => this.toLive(),
      seek: (positionMs) => this.seekTo(positionMs),
    });
  }

  /** The armed archive while the tuner is actually playing it (stable snapshot per inputs). */
  get state(): CatchupState | null {
    return this.armed.activeIn(this.deps.tuner.playing);
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    const unsubscribeTuner = this.deps.tuner.subscribe(listener);
    const unsubscribeArmed = this.armed.subscribe(listener);
    return () => {
      unsubscribeTuner();
      unsubscribeArmed();
    };
  };

  /** A finished archive returns to LIVE playback of the same channel; a seek latched before the media attached is replayed. Returns the unwatch. */
  watch(): () => void {
    return this.deps.engine.subscribe(() => {
      const kind = this.deps.engine.state.kind;
      if (kind === 'Ended') return this.toLive();
      const active = this.state;
      if (kind !== 'Playing' || active === null || active.seek.kind !== 'Pending') return;
      this.deps.engine.seekTo(active.seek.positionMs);
      this.armed.arm({ ...active, seek: NO_SEEK });
    });
  }

  /** Consumes the guide's pending request; true = catch-up owns the tune. */
  resumePending(): boolean {
    const request = this.deps.session.consume();
    if (request === null) return false;
    this.enter(request, false);
    return true;
  }

  skip(): CatchupSkip {
    return this.deps.skip();
  }

  seekBy(deltaMs: number): void {
    const active = this.state;
    if (active === null) return;
    const target = this.deps.engine.positionMs + deltaMs;
    this.seekTo(Math.min(durationOf(active.request), Math.max(0, target)));
  }

  /** The overlay's per-second ticker samples the engine while visible. */
  refreshPosition(): void {
    if (this.state !== null) this.position.refresh(this.deps.engine);
  }

  /** The seek/rewind-live/back keys; true = the key was a catch-up action. */
  onKey(overlay: PlaybackOverlay, key: SimpleRemoteKey): boolean {
    return routeCatchupKey(keyHostOf(this), overlay, key);
  }

  /** BACK at bare catch-up playback returns where catch-up was entered from. */
  back(): void {
    const active = this.state;
    if (active === null) return;
    if (active.fromLive) return this.toLive();
    this.armed.arm(null);
    this.deps.exitToGuide();
  }

  enter(request: CatchupRequest, fromLive: boolean): void {
    this.armed.arm({ request, fromLive, seek: NO_SEEK });
    this.position.reset();
    this.deps.tuner.tune(request.channel, { catchupUrl: request.url });
    this.deps.showTransport();
  }

  /** Archive end and the hop's newest edge both retune live in place. */
  toLive(): void {
    const active = this.state;
    if (active === null) return;
    this.armed.arm(null);
    this.deps.tuner.tune(active.request.channel);
  }

  private seekTo(positionMs: number): void {
    this.deps.engine.seekTo(positionMs);
    const active = this.state;
    if (active !== null && this.deps.engine.state.kind !== 'Playing')
      this.armed.arm({ ...active, seek: { kind: 'Pending', positionMs } });
    this.position.set(positionMs);
    this.deps.showTransport();
  }
}
