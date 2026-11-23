import type { ChannelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';
import type { ParentalControls } from '@/core/settings/parentalControls';

/** The subset of `SheetActions` the dispatcher needs (hosts' test seam). */
export type SheetFlagActions = Pick<SheetActions, 'toggleFavorite' | 'hide' | 'blockMode' | 'submitBlockPin'>;

/** PIN dialog flavours of the sheet's Block/Unblock row; the mode IS the dialog title (Android `BlockPinMode`). */
export type BlockPinMode = 'Set a PIN' | 'Enter PIN';

/**
 * The channel-flag mutations a context sheet performs, bundled for BOTH
 * hosts (Android `SheetActions` + `ChannelBlocker`): favorites and hiding
 * persist straight through the repository; hiding the watched channel zaps
 * away from it first; both block directions are PIN-gated.
 */
export class SheetActions {
  constructor(
    private readonly channels: ChannelRepository,
    private readonly parental: ParentalControls,
    private readonly zapAway: (channel: ChannelRow) => void,
  ) {}

  toggleFavorite(channel: ChannelRow): Promise<number> {
    return this.channels.updateFlags(channel.id, { favorite: !channel.favorite });
  }

  hide(channel: ChannelRow): Promise<number> {
    this.zapAway(channel);
    return this.channels.updateFlags(channel.id, { hidden: true });
  }

  /** No PIN yet → set one first; otherwise confirm it before flipping the flag. */
  blockMode(): BlockPinMode {
    return this.parental.hasPin ? 'Enter PIN' : 'Set a PIN';
  }

  /**
   * True when the PIN was accepted (or freshly set) and the flag flipped off
   * the FRESH row; false keeps the dialog up.
   */
  async submitBlockPin(pin: string, mode: BlockPinMode, channelId: number): Promise<boolean> {
    if (mode === 'Set a PIN') {
      await this.parental.setPin(pin);
      this.parental.setEnabled(true);
    } else if (!(await this.parental.verifyPin(pin))) {
      return false;
    }
    const fresh = await this.channels.byId(channelId);
    if (fresh !== null) await this.channels.updateFlags(channelId, { blocked: !fresh.blocked });
    return true;
  }
}
