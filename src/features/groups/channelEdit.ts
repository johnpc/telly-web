import type { ChannelRow } from '@/core/db/types';
import { channelsIn, FAVORITES } from '@/features/guide/guideRowsBuilder';
import { editorRows, moveFavorite, moveInGroup, toggled } from './channelReorder';

/** Persists whole rows (Android `ChannelDao.update`). */
export type PersistRows = (rows: readonly ChannelRow[]) => Promise<void>;

/**
 * Shared logic of the two channel-management screens (Android
 * `ChannelEditViewModel`): a null `group` is Manage Favorites (all channels,
 * favorites first, OK toggles), a non-null one is Reorder channels within
 * that group. LEFT/RIGHT moves the focused row; every change persists.
 */
export class ChannelEdit {
  constructor(
    private readonly persist: PersistRows,
    private readonly group: string | null = null,
  ) {}

  rows(channels: readonly ChannelRow[]): ChannelRow[] {
    return this.group === null ? editorRows(channels) : channelsIn(channels, this.group);
  }

  /** OK in Manage Favorites toggles; the reorder screen keeps OK inert. */
  toggle(channels: readonly ChannelRow[], channel: ChannelRow): Promise<void> {
    if (this.group !== null) return Promise.resolve();
    return this.persist([toggled(channels, channel)]);
  }

  /** LEFT (-1) / RIGHT (+1) moves the focused row up/down the order. */
  move(channels: readonly ChannelRow[], channelId: number, delta: number): Promise<void> {
    const updates =
      this.group === null || this.group === FAVORITES
        ? moveFavorite(channels, channelId, delta)
        : moveInGroup(this.rows(channels), channelId, delta);
    return updates.length === 0 ? Promise.resolve() : this.persist(updates);
  }
}

export const CHANNEL_EDIT_PREFIX = 'channel-edit-';

export function channelEditFocusId(channelId: number): string {
  return `${CHANNEL_EDIT_PREFIX}${channelId}`;
}

export const MANAGE_FAVORITES_TITLE = 'Manage Favorites';
export const REORDER_CHANNELS_TITLE = 'Reorder channels';
export const CHANNEL_EDIT_MOVE_HINT = 'Press LEFT/RIGHT to move the focused channel';
export const CHANNEL_NAMES_EDITOR_TITLE = 'Channel names editor';
export const CHANNEL_NAMES_EDITOR_HINT = 'Press OK to rename a channel';
