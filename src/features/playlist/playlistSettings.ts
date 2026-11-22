import { boolSetting, intSetting, type Setting, stringSetting } from '@/core/settings/setting';

/**
 * Per-playlist settings keyed by the playlist URL (port of Android
 * `PlaylistExtraSettings` + `playlistEnabledSetting`); same keys so a backup
 * restores them. A playlist URL edit re-keys these via `playlistKeyMigration`.
 */
export function playlistEnabledSetting(url: string): Setting<boolean> {
  return boolSetting(`playlist_enabled:${url}`, true);
}

/** User-Agent for this playlist (persisted for parity; browsers cannot send it). */
export function playlistUserAgentSetting(url: string): Setting<string> {
  return stringSetting(`playlist_user_agent:${url}`, '');
}

/** "Update interval, hours" (0 = the captured default "None"). */
export function playlistUpdateIntervalSetting(url: string): Setting<number> {
  return intSetting(`playlist_update_interval:${url}`, 0);
}

/** "Update on app start": forces a fetch at launch for this playlist. */
export function playlistUpdateOnStartSetting(url: string): Setting<boolean> {
  return boolSetting(`playlist_update_on_start:${url}`, false);
}

/** Manage groups: whether the playlist's `group` is shown (default on). */
export function playlistGroupEnabledSetting(url: string, group: string): Setting<boolean> {
  return boolSetting(`playlist_group_enabled:${url}:${group}`, true);
}

/** The per-playlist update-interval choices (TiviMate's playlist picker). */
export const PLAYLIST_UPDATE_INTERVAL_HOURS: readonly number[] = [0, 1, 2, 4, 8, 12, 24];
