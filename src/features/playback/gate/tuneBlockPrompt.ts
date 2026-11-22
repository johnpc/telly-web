import type { ChannelRow } from '@/core/db/types';
import type { BlockGate } from './blockGate';

/** The tune the prompt replays: `TuneController.tune` (the gate passes it once). */
export type Retune = (channel: ChannelRow) => void;

/**
 * Screen-facing half of the blocked-channel tune gate: commits PIN entries
 * (a verified PIN releases the pending tune and fires `onUnlocked`) and
 * cancels (never tunes, fires `onDismissed`) — Android `TuneBlockPrompt`.
 */
export class TuneBlockPrompt {
  constructor(
    private readonly gate: BlockGate,
    private readonly retune: Retune,
    private readonly onUnlocked: () => void = () => undefined,
    private readonly onDismissed: () => void = () => undefined,
  ) {}

  get channel(): ChannelRow | null {
    return this.gate.prompt;
  }

  /** Wrong PINs keep prompting; the right one tunes the pending channel. True when it tuned. */
  async submit(pin: string): Promise<boolean> {
    const channel = await this.gate.unlock(pin);
    if (channel === null) return false;
    this.retune(channel);
    this.onUnlocked();
    return true;
  }

  dismiss(): void {
    this.gate.dismiss();
    this.onDismissed();
  }
}
