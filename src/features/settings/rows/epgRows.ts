import { epgSourceName } from '@/core/db/epgSourceRepository';
import type { EpgSourceRow } from '@/core/db/types';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { intervalLabel } from '../pickers/pickerSpec';
import { RowIds } from '../rowIds';
import type { PlaylistItem } from '../settingsFeeds';
import { action, header, note, type SettingsRow, toggle, value } from '../settingsRow';

/** EPG pane rows (catalogue 57; port of Android `SettingsRowsEpg.kt`). */
export function epgRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.EPG_SOURCES, 'EPG sources'),
    value(RowIds.EPG_PAST_DAYS, 'Past days to keep EPG', String(s.get(TellySettings.EPG_PAST_DAYS_TO_KEEP))),
    toggle(
      RowIds.EPG_STORE_DESCRIPTIONS,
      'Store program descriptions',
      s.get(TellySettings.EPG_STORE_DESCRIPTIONS),
    ),
    header('Update options'),
    value(
      RowIds.EPG_UPDATE_INTERVAL,
      'Update interval, hours',
      intervalLabel(s.get(TellySettings.EPG_UPDATE_INTERVAL_HOURS)),
    ),
    toggle(
      RowIds.EPG_UPDATE_ON_APP_START,
      'Update on app start',
      s.get(TellySettings.EPG_UPDATE_ON_APP_START),
    ),
    toggle(
      RowIds.EPG_UPDATE_ON_PLAYLISTS_CHANGE,
      'Update on playlists change',
      s.get(TellySettings.EPG_UPDATE_ON_PLAYLISTS_CHANGE),
    ),
    action(RowIds.EPG_UPDATE_NOW, 'Update EPG'),
  ];
}

/**
 * EPG sources pane (catalogue 58): one row per playlist url-tvg source,
 * then the custom sources in added order. The reference free tier LOCKS
 * "Add source"; telly ships it unlocked by product directive.
 */
export function epgSourcesRows(
  playlists: readonly PlaylistItem[],
  sources: readonly EpgSourceRow[],
): SettingsRow[] {
  const auto = playlists
    .filter((item) => item.epgUrl !== null)
    .map((item) =>
      value(RowIds.EPG_SOURCE_PREFIX + item.url, `${item.name} (default)`, item.epgUrl ?? undefined, {
        checkIcon: true,
      }),
    );
  const custom = sources.map((source) =>
    value(RowIds.EPG_CUSTOM_SOURCE_PREFIX + source.id, epgSourceName(source.url), source.url, {
      checkIcon: true,
    }),
  );
  return [
    ...auto,
    ...custom,
    action(RowIds.EPG_ADD_SOURCE, 'Add source'),
    note('EPG sources should be assigned in the playlist settings', false),
  ];
}

/** One custom source's pane: edit its URL or delete it. */
export function epgSourceDetailRows(source: EpgSourceRow): SettingsRow[] {
  return [
    value(RowIds.EPG_SOURCE_URL, 'Source URL', source.url),
    action(RowIds.EPG_SOURCE_DELETE, 'Delete source'),
  ];
}
