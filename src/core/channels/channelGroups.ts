import { keyOf } from '@/core/db/channelIdentity';
import { byFavoriteOrder } from '@/core/db/channelOrder';
import type { ChannelRow } from '@/core/db/types';

/** The two synthetic groups every group column lists first (Android `GroupNames`). */
export const FAVORITES = 'Favorites';
export const ALL_CHANNELS = 'All channels';

/** A user-made group: its name plus the refresh-stable keys of its members. */
export interface CustomGroup {
  name: string;
  members: ReadonlySet<string>;
}

/** Appearance -> Groups: which synthetic groups the column lists. */
export interface GroupVisibility {
  allChannels: boolean;
  favorites: boolean;
}

/** Groups column order (capture 25): Favorites, All channels, playlist groups, then custom groups. */
export function groupNames(channels: readonly ChannelRow[], custom: readonly CustomGroup[] = []): string[] {
  const playlistGroups = channels.map((c) => c.groupTitle).filter((g): g is string => g !== null);
  return [...new Set([FAVORITES, ALL_CHANNELS, ...playlistGroups, ...custom.map((g) => g.name)])];
}

/** Hidden synthetic groups drop out of the LIST only (Android `GroupVisibility`). */
export function visibleGroupNames(names: readonly string[], visibility: GroupVisibility): string[] {
  return names.filter(
    (g) => !((g === ALL_CHANNELS && !visibility.allChannels) || (g === FAVORITES && !visibility.favorites)),
  );
}

function customMembers(
  list: readonly ChannelRow[],
  group: string,
  custom: readonly CustomGroup[],
): ChannelRow[] {
  const members = custom.find((g) => g.name === group)?.members;
  return members === undefined ? [] : list.filter((c) => members.has(keyOf(c)));
}

/**
 * The channels of `group`: Favorites honour the Manage-Favorites order, a
 * custom group matches by channel key, and a name shared with a playlist
 * group resolves to the playlist group.
 */
export function channelsIn(
  list: readonly ChannelRow[],
  group: string,
  custom: readonly CustomGroup[] = [],
): ChannelRow[] {
  if (group === ALL_CHANNELS) return [...list];
  if (group === FAVORITES) return list.filter((c) => c.favorite).sort(byFavoriteOrder);
  const playlist = list.filter((c) => c.groupTitle === group);
  return playlist.length > 0 ? playlist : customMembers(list, group, custom);
}
