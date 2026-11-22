import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import {
  playlistEnabledSetting,
  playlistGroupEnabledSetting,
  playlistUpdateIntervalSetting,
  playlistUpdateOnStartSetting,
  playlistUserAgentSetting,
} from '@/features/playlist/playlistSettings';
import { intervalLabel } from '../pickers/pickerSpec';
import { RowIds } from '../rowIds';
import type { PlaylistItem } from '../settingsFeeds';
import { action, header, notSet, type SettingsRow, toggle, value } from '../settingsRow';

/** "No sources" / "1 source" / "N sources", as capture 20 words it. */
export function epgSourceCountSummary(count: number): string {
  if (count === 0) return 'No sources';
  return count === 1 ? '1 source' : `${count} sources`;
}

function sorted(s: SettingsRepository, playlists: readonly PlaylistItem[]): PlaylistItem[] {
  const copy = [...playlists];
  if (s.get(TellySettings.PLAYLISTS_SORTING) !== 'By name') return copy;
  return copy.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

/** Playlists pane rows (catalogue 19): playlist list + list-level actions. */
export function playlistsRows(s: SettingsRepository, playlists: readonly PlaylistItem[]): SettingsRow[] {
  const items = sorted(s, playlists).map((item) =>
    value(RowIds.PLAYLIST_PREFIX + item.url, item.name, `Channels: ${item.channelCount}`, {
      checkIcon: true,
    }),
  );
  return [
    ...items,
    value(RowIds.PLAYLISTS_SORTING, 'Playlists sorting', s.get(TellySettings.PLAYLISTS_SORTING)),
    action(RowIds.ADD_PLAYLIST, 'Add playlist'),
    action(RowIds.UPDATE_ALL_PLAYLISTS, 'Update all playlists'),
  ];
}

/** Per-playlist pane rows (catalogue 20–21). */
export function playlistDetailRows(
  s: SettingsRepository,
  item: PlaylistItem,
  customEpgSourceCount: number,
): SettingsRow[] {
  const sourceCount = (item.epgUrl === null ? 0 : 1) + customEpgSourceCount;
  return [
    toggle(RowIds.PLAYLIST_ENABLE, 'Enable playlist', s.get(playlistEnabledSetting(item.url))),
    value(RowIds.PLAYLIST_NAME, 'Playlist name', item.name),
    value(RowIds.PLAYLIST_URL, 'Playlist URL', item.url),
    value(RowIds.PLAYLIST_EPG_SOURCES, 'EPG sources', epgSourceCountSummary(sourceCount)),
    value(RowIds.PLAYLIST_USER_AGENT, 'User-Agent', notSet(s.get(playlistUserAgentSetting(item.url)))),
    value(RowIds.PLAYLIST_MANAGE_GROUPS, 'Manage groups'),
    header('Update options'),
    value(
      RowIds.PLAYLIST_UPDATE_INTERVAL,
      'Update interval, hours',
      intervalLabel(s.get(playlistUpdateIntervalSetting(item.url))),
    ),
    toggle(
      RowIds.PLAYLIST_UPDATE_ON_START,
      'Update on app start',
      s.get(playlistUpdateOnStartSetting(item.url)),
    ),
    action(RowIds.PLAYLIST_UPDATE_NOW, 'Update playlist'),
    action(RowIds.PLAYLIST_DELETE, 'Delete playlist'),
  ];
}

/**
 * Manage groups sub-pane: one toggle per group title of the playlist,
 * default on. Disabled groups' channels disappear from the guide, panel
 * and search (filtered at the visible-channel query seam).
 */
export function playlistGroupRows(s: SettingsRepository, item: PlaylistItem): SettingsRow[] {
  return item.groups.map((group) =>
    toggle(RowIds.PLAYLIST_GROUP_PREFIX + group, group, s.get(playlistGroupEnabledSetting(item.url, group))),
  );
}
