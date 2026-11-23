import type { ChannelRow } from '@/core/db/types';
import type { BlockGate } from '@/features/playback/gate/blockGate';

/** The pane action a tune performs once the channel may play (add / change). */
export type PaneAction = (channel: ChannelRow) => void;

/**
 * The blocked-channel PIN gate over EVERY multiview tune path (entry pane,
 * picker pick, CH+/- zap): a gated tune stashes its pane action behind the
 * shared `BlockGate` prompt, the verified PIN replays it exactly once, and a
 * wrong or cancelled PIN never tunes. The shared `BlockSession` relock
 * semantics ride along inside the gate (Android `MultiviewTuneGate`).
 */
export class MultiviewTuneGate {
  private pending: PaneAction | null = null;

  constructor(private readonly gate: BlockGate) {}

  /** The blocked channel awaiting a PIN (drives the PIN card layer). */
  get prompt(): ChannelRow | null {
    return this.gate.prompt;
  }

  get promptOpen(): boolean {
    return this.gate.prompt !== null;
  }

  /** The persisted "PIN input method" choice, honoured by the PIN card. */
  get keyboardPin(): boolean {
    return this.gate.keyboardPin;
  }

  subscribe(listener: () => void): () => void {
    return this.gate.subscribe(listener);
  }

  /** Runs `action` now, or stashes it behind the PIN prompt when gated. */
  tune(channel: ChannelRow, action: PaneAction): void {
    if (this.gate.intercept(channel)) this.pending = action;
    else action(channel);
  }

  /** A verified PIN replays the stashed action once (re-entering `tune` consumes the one-shot pass). */
  async submit(pin: string): Promise<boolean> {
    const unlocked = await this.gate.unlock(pin);
    if (unlocked === null) return false;
    const action = this.pending;
    this.pending = null;
    if (action !== null) this.tune(unlocked, action);
    return true;
  }

  /** Cancelling never tunes; the stashed action is dropped. */
  dismiss(): void {
    this.gate.dismiss();
    this.pending = null;
  }
}
