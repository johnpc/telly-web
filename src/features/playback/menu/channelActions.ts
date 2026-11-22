import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import type { ChannelRow } from '@/core/db/types';

/**
 * The channel context-menu actions that persist: favorite toggling, hiding
 * and blocking go straight through the repository so they survive restarts
 * and playlist refreshes (Android `ChannelActions`).
 */
export class ChannelActions {
  constructor(private readonly channels: ChannelRepository = channelRepository) {}

  async toggleFavorite(channel: ChannelRow): Promise<void> {
    await this.channels.updateFlags(channel.id, { favorite: !channel.favorite });
  }

  async hide(channel: ChannelRow): Promise<void> {
    await this.channels.updateFlags(channel.id, { hidden: true });
  }

  /** Block/unblock; blocked channels stay listed but PIN-gate tuning. */
  async toggleBlocked(channel: ChannelRow): Promise<void> {
    await this.channels.updateFlags(channel.id, { blocked: !channel.blocked });
  }
}

export const channelActions = new ChannelActions();
