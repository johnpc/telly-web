import type { PlayerEngine } from '@/core/player';
import type { TuneController } from '../tune/tuneController';

/**
 * Foreground/background transitions for the screen that owns the tuner
 * (Android `PlaybackLifecycle`): going hidden stops the stream — the
 * reference releases its codecs the moment it is backgrounded — and the
 * first visibility after a stop re-tunes the current channel. `shouldStop`
 * makes the stop PIP-aware: the picture-in-picture window keeps playing.
 */
// @stateMachine('Background suspend')
export type SuspendState = 'Running' | 'Suspended';

export class PlaybackLifecycle {
  private state: SuspendState = 'Running';

  constructor(
    private readonly tuner: Pick<TuneController, 'current' | 'retune'>,
    private readonly engine: Pick<PlayerEngine, 'stop'>,
    private readonly shouldStop: () => boolean = () => true,
  ) {}

  get current(): SuspendState {
    return this.state;
  }

  onBackground(): void {
    if (this.tuner.current === null || !this.shouldStop()) return;
    this.engine.stop();
    this.state = 'Suspended';
  }

  /** True exactly once after a background stop: the stream was re-tuned. */
  onForeground(): boolean {
    if (this.state !== 'Suspended') return false;
    this.state = 'Running';
    this.tuner.retune();
    return true;
  }
}
