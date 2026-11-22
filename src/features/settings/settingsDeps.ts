import { clearSearchHistory } from '@/features/search';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type EpgSourceRepository, epgSourceRepository } from '@/core/db/epgSourceRepository';
import { type PlaylistRepository, playlistRepository } from '@/core/db/playlistRepository';
import { type RecordingRepository, recordingRepository } from '@/core/db/recordingRepository';
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import { type VodRepository, vodRepository } from '@/core/db/vodRepository';
import { ParentalControls } from '@/core/settings/parentalControls';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { createEpgRefresher } from '@/features/epg/epgWiring';
import { defaultRefreshDeps, tryUpdatePlaylist } from '@/features/playlist/playlistRefresh';
import { SettingsBackupManager } from './backup/settingsBackup';
import { changePlaylistUrl } from './playlistUrlChanger';

/** The controller's exits into the shell (Android `SettingsCallbacks`). */
export interface SettingsCallbacks {
  onAddPlaylist: () => void;
  onExportBackup: (json: string) => void;
  onImportBackup: () => void;
  onOpenPrivacyPolicy: () => void;
}

/** Search history lives outside the settings store (Android: its own prefs file). */

/** Everything the settings tree reads/edits beyond the prefs map (Android `SettingsGraph`). */
export interface SettingsDeps {
  settings: SettingsRepository;
  parental: ParentalControls;
  playlists: PlaylistRepository;
  epgSources: EpgSourceRepository;
  reminders: ReminderRepository;
  channels: ChannelRepository;
  vod: VodRepository;
  recordings: RecordingRepository;
  backup: SettingsBackupManager;
  /** "Update playlist": true when fetched and re-imported. */
  updatePlaylist: (url: string) => Promise<boolean>;
  /** "Update EPG": refreshes every source; returns the updated-playlist count. */
  updateEpgNow: () => Promise<number>;
  /** Playlist URL edit; false keeps the old URL. */
  changePlaylistUrl: (oldUrl: string, newUrl: string) => Promise<boolean>;
  clearSearchHistory: () => void;
  versionName: string;
  callbacks: SettingsCallbacks;
}

export const noopCallbacks: SettingsCallbacks = {
  onAddPlaylist: (): void => undefined,
  onExportBackup: (): void => undefined,
  onImportBackup: (): void => undefined,
  onOpenPrivacyPolicy: (): void => undefined,
};

/** The build's version from Vite's env (`VITE_APP_VERSION`), else "dev". */
export function appVersionName(env: Record<string, string | undefined> = import.meta.env): string {
  return env.VITE_APP_VERSION ?? 'dev';
}

/** The production graph over the default repositories (Android `ServiceLocator` wiring). */
export function defaultSettingsDeps(
  settings: SettingsRepository,
  callbacks: SettingsCallbacks,
  overrides: Partial<SettingsDeps> = {},
): SettingsDeps {
  const refreshDeps = (): ReturnType<typeof defaultRefreshDeps> =>
    defaultRefreshDeps(settings.get(TellySettings.CORS_PROXY));
  return {
    settings,
    parental: new ParentalControls(settings),
    playlists: playlistRepository,
    epgSources: epgSourceRepository,
    reminders: reminderRepository,
    channels: channelRepository,
    vod: vodRepository,
    recordings: recordingRepository,
    backup: new SettingsBackupManager(settings, playlistRepository),
    updatePlaylist: (url) => tryUpdatePlaylist(url, refreshDeps()),
    updateEpgNow: async () => (await createEpgRefresher(settings).refreshAllNow()).length,
    changePlaylistUrl: (oldUrl, newUrl) =>
      changePlaylistUrl(oldUrl, newUrl, {
        fetchText: refreshDeps().fetchText,
        playlists: playlistRepository,
        epgSources: epgSourceRepository,
        settings,
      }),
    clearSearchHistory: () => clearSearchHistory(),
    versionName: appVersionName(),
    callbacks,
    ...overrides,
  };
}
