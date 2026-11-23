import type { PlayerEngine } from '@/core/player';
import { Observable } from '@/core/state/observable';
import { NO_PROGRESS, sameProgress, type VodProgress } from './vodStage';
import { VodTransportVisibility } from './vodTransportVisibility';

/** LEFT/RIGHT seek step. */
export const SEEK_STEP_MS = 10_000;
/** RW/FF jump step. */
export const JUMP_STEP_MS = 30_000;

/**
 * The transport's player-facing half (Android `VodPlayerControls`):
 * pause/seek/clock sampling over the engine. Inert unless `active` (the
 * ViewModel's `VodStage` is Playing) — the resume prompt's keys must never
 * reach the player. Pause is the ENGINE's own flag, never a copy.
 */
export class VodPlayerControls extends Observable {
  private sampled: VodProgress = NO_PROGRESS;

  constructor(
    private readonly engine: PlayerEngine,
    readonly transport: VodTransportVisibility,
    private readonly persistOnPause: () => void,
    private readonly active: () => boolean,
  ) {
    super();
  }

  get paused(): boolean {
    return this.engine.paused;
  }

  get progress(): VodProgress {
    return this.sampled;
  }

  /** Playback (re)started: reveal the transport. */
  reveal(): void {
    this.transport.poke(false);
    this.notify();
  }

  togglePause(): void {
    if (!this.active()) return;
    if (this.engine.paused) {
      this.engine.play();
    } else {
      this.engine.pause();
      this.persistOnPause();
    }
    this.transport.poke(this.engine.paused);
    this.notify();
  }

  seekBy(deltaMs: number): void {
    if (!this.active()) return;
    const duration = this.durationMs();
    const target = Math.max(0, this.engine.positionMs + deltaMs);
    this.engine.seekTo(duration > 0 ? Math.min(target, duration) : target);
    this.sample();
    this.transport.poke(this.engine.paused);
  }

  sample(): void {
    const next = { positionMs: this.positionMs(), durationMs: this.durationMs() };
    if (sameProgress(next, this.sampled)) return;
    this.sampled = next;
    this.notify();
  }

  positionMs(): number {
    return Math.max(0, this.engine.positionMs);
  }

  /** Finite duration only: live streams report Infinity, which VOD treats as unknown. */
  durationMs(): number {
    const duration = this.engine.durationMs;
    return Number.isFinite(duration) ? Math.max(0, duration) : 0;
  }
}

export interface VodControlsHooks {
  persistOnPause: () => void;
  /** True while the ViewModel's `VodStage` is Playing. */
  active: () => boolean;
  /** Forwarded on every controls / transport change. */
  changed: () => void;
}

/** Controls over a fresh transport, both forwarding their changes to the owner. */
export function createVodControls(
  engine: PlayerEngine,
  hideAfterMs: () => number,
  hooks: VodControlsHooks,
): VodPlayerControls {
  const transport = new VodTransportVisibility(hideAfterMs);
  const controls = new VodPlayerControls(engine, transport, hooks.persistOnPause, hooks.active);
  controls.subscribe(hooks.changed);
  transport.subscribe(hooks.changed);
  return controls;
}
