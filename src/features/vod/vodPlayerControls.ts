import type { PlayerEngine } from '@/core/player';
import { Observable } from '@/features/guide/observable';
import { NO_PROGRESS, sameProgress, type VodProgress } from './vodStage';
import type { VodTransportVisibility } from './vodTransportVisibility';

/** LEFT/RIGHT seek step. */
export const SEEK_STEP_MS = 10_000;
/** RW/FF jump step. */
export const JUMP_STEP_MS = 30_000;

/**
 * The transport's player-facing half (Android `VodPlayerControls`):
 * pause/seek/clock sampling over the engine. Inert until `begin` — the
 * resume prompt's keys must never reach the player.
 */
export class VodPlayerControls extends Observable {
  private active = false;
  private pausedFlag = false;
  private sampled: VodProgress = NO_PROGRESS;

  constructor(
    private readonly engine: PlayerEngine,
    readonly transport: VodTransportVisibility,
    private readonly persistOnPause: () => void,
  ) {
    super();
  }

  get paused(): boolean {
    return this.pausedFlag;
  }

  get progress(): VodProgress {
    return this.sampled;
  }

  /** Arms the controls once playback starts and reveals the transport. */
  begin(): void {
    this.active = true;
    this.pausedFlag = false;
    this.transport.poke(false);
    this.notify();
  }

  togglePause(): void {
    if (!this.active) return;
    this.pausedFlag = !this.pausedFlag;
    if (this.pausedFlag) {
      this.engine.pause();
      this.persistOnPause();
    } else {
      this.engine.play();
    }
    this.transport.poke(this.pausedFlag);
    this.notify();
  }

  seekBy(deltaMs: number): void {
    if (!this.active) return;
    const duration = this.durationMs();
    const target = Math.max(0, this.engine.positionMs + deltaMs);
    this.engine.seekTo(duration > 0 ? Math.min(target, duration) : target);
    this.sample();
    this.transport.poke(this.pausedFlag);
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
