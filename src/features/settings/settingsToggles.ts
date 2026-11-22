import type { Setting } from '@/core/settings/setting';
import { TellySettings } from '@/core/settings/tellySettings';
import { RowIds } from './rowIds';

/** Row id -> boolean setting; the controller flips these generically (Android `SettingsToggles`). */
export const togglesByRowId: ReadonlyMap<string, Setting<boolean>> = new Map<string, Setting<boolean>>([
  [RowIds.AUTOSTART_BOOT, TellySettings.AUTOSTART_ON_BOOT],
  [RowIds.AUTOSTART_WAKE, TellySettings.AUTOSTART_ON_WAKE],
  [RowIds.LAST_CHANNEL, TellySettings.LAST_CHANNEL_ON_START],
  [RowIds.PIP_ON_HOME, TellySettings.PIP_ON_HOME],
  [RowIds.CONFIRM_EXIT, TellySettings.CONFIRM_EXIT],
  [RowIds.AUTO_BACKUP, TellySettings.AUTO_BACKUP],
  [RowIds.EPG_STORE_DESCRIPTIONS, TellySettings.EPG_STORE_DESCRIPTIONS],
  [RowIds.EPG_UPDATE_ON_APP_START, TellySettings.EPG_UPDATE_ON_APP_START],
  [RowIds.EPG_UPDATE_ON_PLAYLISTS_CHANGE, TellySettings.EPG_UPDATE_ON_PLAYLISTS_CHANGE],
  [RowIds.PLAYBACK_SURROUND, TellySettings.SURROUND_BY_DEFAULT],
  [RowIds.PLAYBACK_PASSTHROUGH, TellySettings.AUDIO_PASSTHROUGH],
  [RowIds.REMOTE_SEEK_RWFF, TellySettings.SEEK_RWFF_CATCHUP],
  [RowIds.REMOTE_RW_LIVE, TellySettings.RW_REWINDS_LIVE],
  [RowIds.REMOTE_SEEK_LEFT_RIGHT, TellySettings.SEEK_LEFT_RIGHT],
  [RowIds.REMOTE_LEFT_LIVE, TellySettings.LEFT_REWINDS_LIVE],
  [RowIds.REMOTE_SEEK_DOWN_UP, TellySettings.SEEK_DOWN_UP],
  [RowIds.REMOTE_DOWN_LIVE, TellySettings.DOWN_REWINDS_LIVE],
  [RowIds.PARENTAL_CHANNELS_ONLY, TellySettings.PARENTAL_CHANNELS_ONLY],
  [RowIds.PARENTAL_REQUIRE_SETTINGS, TellySettings.PARENTAL_REQUIRE_FOR_SETTINGS],
  [RowIds.PARENTAL_REQUIRE_PLAYLISTS, TellySettings.PARENTAL_REQUIRE_FOR_PLAYLISTS],
  [RowIds.VOD_REMEMBER_POSITION, TellySettings.VOD_REMEMBER_POSITION],
  [RowIds.SEARCH_SAVE_HISTORY, TellySettings.SEARCH_SAVE_HISTORY],
  [RowIds.ABOUT_STATISTICS, TellySettings.SEND_STATISTICS],
  [RowIds.APPEARANCE_GUIDE_CHANNEL_NUMBERS, TellySettings.SHOW_CHANNEL_NUMBERS],
  [RowIds.APPEARANCE_PLAYER_SHOW_CLOCK, TellySettings.PLAYER_SHOW_CLOCK],
  [RowIds.APPEARANCE_GROUPS_ALL_CHANNELS, TellySettings.SHOW_ALL_CHANNELS_GROUP],
  [RowIds.APPEARANCE_GROUPS_FAVORITES, TellySettings.SHOW_FAVORITES_GROUP],
  [RowIds.APPEARANCE_LOGOS_ROUNDED, TellySettings.LOGO_ROUNDED_CORNERS],
]);
