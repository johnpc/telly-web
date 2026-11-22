import type { ChannelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';
import type { ParentalControls } from '@/core/settings/parentalControls';
import type { BlockPinMode } from './guideLayer';

/**
 * The favorites/hide/block mutations the guide's sheet performs (Android
 * `GuideSheetChannelActions` + `ChannelBlocker`). Hiding the previewed
 * channel zaps away from it first; both block directions are PIN-gated.
 */
export class GuideSheetActions {
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

  /** True when the PIN was accepted (or freshly set) and the flag flipped; false keeps the dialog up. */
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
