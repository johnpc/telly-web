import type { ChannelRow } from './types';

/** "All channels" zap order: per-channel sort index, `number` breaks cross-playlist ties. */
export function byZapOrder(a: ChannelRow, b: ChannelRow): number {
  return a.sortIndex - b.sortIndex || a.number - b.number;
}

export function byNumber(a: ChannelRow, b: ChannelRow): number {
  return a.number - b.number;
}

/** Manage-Favorites order; ties keep the base zap order. */
export function byFavoriteOrder(a: ChannelRow, b: ChannelRow): number {
  return a.favoriteOrder - b.favoriteOrder || byZapOrder(a, b);
}

export function isVisible(channel: ChannelRow): boolean {
  return !channel.hidden;
}
