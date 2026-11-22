import type { ChannelRow, PlaylistRow } from '@/core/db/types';
import type { PlaylistItem } from './settingsFeeds';

/** Distinct non-null group titles in channel-number order. */
export function groupsOf(channels: readonly ChannelRow[]): string[] {
  const ordered = [...channels].sort((a, b) => a.number - b.number);
  const titles = ordered.map((channel) => channel.groupTitle).filter((title) => title !== null);
  return [...new Set(titles)];
}

function itemOf(playlist: PlaylistRow, channels: readonly ChannelRow[]): PlaylistItem {
  const own = channels.filter((channel) => channel.playlistId === playlist.id);
  return {
    url: playlist.url,
    name: playlist.name,
    channelCount: own.length,
    epgUrl: playlist.epgUrl,
    groups: groupsOf(own),
  };
}

/** The stored playlists mapped to their settings-tree row items (Android `playlistItemsFlow`). */
export function toPlaylistItems(
  playlists: readonly PlaylistRow[],
  channels: readonly ChannelRow[],
): PlaylistItem[] {
  return playlists.map((playlist) => itemOf(playlist, channels));
}
