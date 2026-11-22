import { paneRowIds } from './rowIdsPanes';

/** Stable row identifiers the controller dispatches on (port of Android `RowIds.kt`). */
const coreRowIds = {
  /** Root-sheet section rows append the `SettingsSectionId`. */
  SECTION_PREFIX: 'section:',

  AUTOSTART_BOOT: 'general.autostart_boot',
  AUTOSTART_WAKE: 'general.autostart_wake',
  LAST_CHANNEL: 'general.last_channel',
  PIP_ON_HOME: 'general.pip_on_home',
  CONFIRM_EXIT: 'general.confirm_exit',
  USER_AGENT: 'general.user_agent',
  UDP_PROXY: 'general.udp_proxy',
  CORS_PROXY: 'general.cors_proxy',
  AUTO_BACKUP: 'general.auto_backup',
  BACK_UP_DATA: 'general.back_up_data',
  RESTORE_DATA: 'general.restore_data',

  PLAYLISTS_SORTING: 'playlists.sorting',
  ADD_PLAYLIST: 'playlists.add',
  UPDATE_ALL_PLAYLISTS: 'playlists.update_all',
  /** Per-playlist rows append the playlist URL after the prefix. */
  PLAYLIST_PREFIX: 'playlist:',
  PLAYLIST_ENABLE: 'playlist.enable',
  PLAYLIST_NAME: 'playlist.name',
  PLAYLIST_URL: 'playlist.url',
  PLAYLIST_EPG_SOURCES: 'playlist.epg_sources',
  PLAYLIST_USER_AGENT: 'playlist.user_agent',
  PLAYLIST_MANAGE_GROUPS: 'playlist.manage_groups',
  PLAYLIST_UPDATE_INTERVAL: 'playlist.update_interval',
  PLAYLIST_UPDATE_ON_START: 'playlist.update_on_start',
  PLAYLIST_UPDATE_NOW: 'playlist.update_now',
  PLAYLIST_DELETE: 'playlist.delete',
  /** Manage-groups toggle rows append the group title after the prefix. */
  PLAYLIST_GROUP_PREFIX: 'playlist_group:',

  EPG_SOURCES: 'epg.sources',
  EPG_PAST_DAYS: 'epg.past_days',
  EPG_STORE_DESCRIPTIONS: 'epg.store_descriptions',
  EPG_UPDATE_INTERVAL: 'epg.update_interval',
  EPG_UPDATE_ON_APP_START: 'epg.update_on_app_start',
  EPG_UPDATE_ON_PLAYLISTS_CHANGE: 'epg.update_on_playlists_change',
  EPG_UPDATE_NOW: 'epg.update_now',
  EPG_ADD_SOURCE: 'epg.add_source',
  EPG_SOURCE_PREFIX: 'epg_source:',
  /** Custom source rows append the source's row id after the prefix. */
  EPG_CUSTOM_SOURCE_PREFIX: 'epg_custom_source:',
  EPG_SOURCE_URL: 'epg_source.url',
  EPG_SOURCE_DELETE: 'epg_source.delete',

  PARENTAL_MASTER: 'parental.master',
  PARENTAL_CHANGE_PIN: 'parental.change_pin',
  PARENTAL_PIN_INPUT: 'parental.pin_input',
  PARENTAL_RELOCK: 'parental.relock',
  PARENTAL_CHANNELS_ONLY: 'parental.channels_only',
  PARENTAL_REQUIRE_SETTINGS: 'parental.require_settings',
  PARENTAL_REQUIRE_PLAYLISTS: 'parental.require_playlists',
  PARENTAL_BLOCKED_CHANNELS: 'parental.blocked_channels',
  /** Blocked-channels pane rows append the channel row id after the prefix. */
  BLOCKED_CHANNEL_PREFIX: 'blocked_channel:',

  OTHER_SEARCH: 'other.search',
  OTHER_REMINDERS: 'other.reminders',
  OTHER_RECORDING: 'other.recording',
  OTHER_VOD: 'other.vod',
  SEARCH_SAVE_HISTORY: 'other_search.save_history',
  SEARCH_CLEAR_HISTORY: 'other_search.clear_history',
  REMINDERS_LEAD: 'reminders.lead',
  /** Scheduled-reminder rows append the reminder's row id after the prefix. */
  REMINDER_PREFIX: 'reminder:',
  VOD_REMEMBER_POSITION: 'vod.remember_position',
  VOD_CLEAR_POSITIONS: 'vod.clear_positions',
  RECORDING_STORAGE_USED: 'recording.storage_used',
  RECORDING_FREE_SPACE: 'recording.free_space',
  RECORDING_DELETE_ALL: 'recording.delete_all',

  ABOUT_STATISTICS: 'about.statistics',
  ABOUT_PRIVACY_POLICY: 'about.privacy_policy',
  ABOUT_VERSION: 'about.version',
} as const;

/** Every row id, core + the Appearance/Playback/Remote panes. */
export const RowIds = { ...coreRowIds, ...paneRowIds } as const;

/** The remainder of `rowId` after `prefix`, or null when it does not start with it. */
export function suffixOf(rowId: string, prefix: string): string | null {
  return rowId.startsWith(prefix) ? rowId.slice(prefix.length) : null;
}
