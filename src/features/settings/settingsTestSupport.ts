import { ChannelRepository } from '@/core/db/channelRepository';
import { EpgSourceRepository } from '@/core/db/epgSourceRepository';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import { RecordingRepository } from '@/core/db/recordingRepository';
import { ReminderRepository } from '@/core/db/reminderRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { VodRepository } from '@/core/db/vodRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { SettingsBackupManager } from './backup/settingsBackup';
import { type SettingsCallbacks, type SettingsDeps, noopCallbacks } from './settingsDeps';

/** A settings graph over an isolated database + in-memory settings (unit-test wiring). */
export function fakeDeps(db: TellyDb, overrides: Partial<SettingsDeps> = {}): SettingsDeps {
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const playlists = new PlaylistRepository(db);
  const callbacks: SettingsCallbacks = { ...noopCallbacks };
  return {
    settings,
    parental: new ParentalControls(settings),
    playlists,
    epgSources: new EpgSourceRepository(db),
    reminders: new ReminderRepository(db),
    channels: new ChannelRepository(db),
    vod: new VodRepository(db),
    recordings: new RecordingRepository(db),
    backup: new SettingsBackupManager(settings, playlists, () => 1_000),
    updatePlaylist: async () => true,
    updateEpgNow: async () => 1,
    changePlaylistUrl: async () => true,
    clearSearchHistory: (): void => undefined,
    versionName: '1.2.3',
    callbacks,
    ...overrides,
  };
}

/** Resolves once every queued microtask has run (async controller actions). */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
