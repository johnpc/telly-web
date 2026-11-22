import { byFavoriteOrder } from '@/core/db/channelOrder';
import type { ChannelRow } from '@/core/db/types';

/**
 * Pure ordering math for Manage Favorites and Reorder channels (Android
 * `ChannelReorder`). Favorites order lives in the refresh-surviving
 * `favoriteOrder` flag; group order swaps the neighbours' `sortIndex`.
 * Both return only the rows that must be persisted.
 */
export function favorites(channels: readonly ChannelRow[]): ChannelRow[] {
  return channels.filter((c) => c.favorite).sort(byFavoriteOrder);
}

/** Manage Favorites list: favorites first (in order), then the rest. */
export function editorRows(channels: readonly ChannelRow[]): ChannelRow[] {
  return [...favorites(channels), ...channels.filter((c) => !c.favorite)];
}

/** OK toggles: adding appends to the favorites order, removing keeps it. */
export function toggled(channels: readonly ChannelRow[], channel: ChannelRow): ChannelRow {
  if (channel.favorite) return { ...channel, favorite: false };
  const nextOrder = Math.max(-1, ...favorites(channels).map((c) => c.favoriteOrder)) + 1;
  return { ...channel, favorite: true, favoriteOrder: nextOrder };
}

/** The focused channel and its neighbour `delta` away, or null off either end. */
function neighbours(
  ordered: readonly ChannelRow[],
  channelId: number,
  delta: number,
): [ChannelRow, ChannelRow] | null {
  const index = ordered.findIndex((c) => c.id === channelId);
  const a = ordered[index];
  const b = ordered[index + delta];
  return index < 0 || a === undefined || b === undefined ? null : [a, b];
}

function swap(ordered: readonly ChannelRow[], channelId: number, delta: number): ChannelRow[] | null {
  const pair = neighbours(ordered, channelId, delta);
  if (pair === null) return null;
  return ordered.map((c) => (c === pair[0] ? pair[1] : c === pair[1] ? pair[0] : c));
}

/** LEFT/RIGHT on a favorite moves it within the favorites order. */
export function moveFavorite(
  channels: readonly ChannelRow[],
  channelId: number,
  delta: number,
): ChannelRow[] {
  const reordered = swap(favorites(channels), channelId, delta);
  if (reordered === null) return [];
  return reordered
    .map((channel, index) => ({ ...channel, favoriteOrder: index }))
    .filter((channel, index) => reordered[index]?.favoriteOrder !== channel.favoriteOrder);
}

/** LEFT/RIGHT in a group swaps the two neighbours' sort indices. */
export function moveInGroup(ordered: readonly ChannelRow[], channelId: number, delta: number): ChannelRow[] {
  const pair = neighbours(ordered, channelId, delta);
  if (pair === null) return [];
  const [a, b] = pair;
  return [
    { ...a, sortIndex: b.sortIndex },
    { ...b, sortIndex: a.sortIndex },
  ];
}
