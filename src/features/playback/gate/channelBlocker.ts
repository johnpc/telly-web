import type { ChannelRow } from '@/core/db/types';
import type { ParentalControls } from '@/core/settings/parentalControls';
import type { ChannelActions } from '../menu/channelActions';

/** Which PIN dialog the Block/Unblock row needs before it may act. */
export type BlockPinMode = 'Setup' | 'Confirm';

export const BLOCK_PIN_TITLES: Readonly<Record<BlockPinMode, string>> = {
  /** No parental PIN exists yet: set one first (reused setup wheel). */
  Setup: 'Set a PIN',
  /** A PIN is configured: confirm it before flipping the flag. */
  Confirm: 'Enter PIN',
};

/**
 * The context sheet's "Block channel" / "Unblock channel" policy: both
 * directions are PIN-gated — confirming the configured PIN, or setting one
 * first when none exists (Android `ChannelBlocker`).
 */
export class ChannelBlocker {
  constructor(
    private readonly actions: Pick<ChannelActions, 'toggleBlocked'>,
    private readonly parental: ParentalControls | null = null,
  ) {}

  /** The dialog the next block/unblock needs, decided at open time. */
  mode(): BlockPinMode {
    return this.parental?.hasPin === true ? 'Confirm' : 'Setup';
  }

  /** Sets/verifies the PIN; flips `channel`'s blocked flag on success. */
  async submit(pin: string, mode: BlockPinMode, channel: ChannelRow): Promise<boolean> {
    if (this.parental === null) return false;
    if (mode === 'Setup') await this.parental.setPin(pin);
    else if (!(await this.parental.verifyPin(pin))) return false;
    await this.actions.toggleBlocked(channel);
    return true;
  }
}
