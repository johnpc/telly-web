import { channelRepository } from '@/core/db/channelRepository';
import { programRepository } from '@/core/db/programRepository';
import { sharedRefreshGate } from '@/core/refresh/refreshGate';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { defaultRefreshDeps, updatePlaylist } from '@/features/playlist/playlistRefresh';
import { writeAutoBackup } from '@/features/settings/backup/autoBackupFile';

/** What the acceptance steps read off a stored channel (Android `channelDao().observeVisible()`). */
export interface StoredChannel {
  tvgId: string | null;
  number: number;
  favorite: boolean;
}

/** A stored programme as the `@epg-data` steps compare it against the served fixture. */
export interface StoredProgram {
  title: string;
  startMs: number;
  endMs: number;
  description: string | null;
}

/**
 * `window.telly` seams for the onboarding + EPG-data legs: the Android steps
 * read Room and seed the backup file; these do the same over Dexie/OPFS.
 */
export interface OnboardingTestHooks {
  /** `Idle` once every queued refresh finished (the EPG steps wait on it). */
  refreshGateState(): string;
  writeAutoBackup(json: string): Promise<void>;
  channel(name: string): Promise<StoredChannel | null>;
  programs(tvgId: string, fromMs: number, toMs: number): Promise<StoredProgram[]>;
  programCount(): Promise<number>;
  setFavorite(name: string, favorite: boolean): Promise<void>;
  /** Writes `channels.blocked` through Dexie so every live query reacts (Android writes the Room row). */
  setBlocked(name: string, blocked: boolean): Promise<void>;
  /** "Update playlist" without the settings sheet: the same refresh path it drives. */
  refreshPlaylist(url: string): Promise<void>;
}

async function channelNamed(name: string): Promise<StoredChannel | null> {
  const row = (await channelRepository.visible()).find((channel) => channel.name === name);
  return row === undefined ? null : { tvgId: row.tvgId, number: row.number, favorite: row.favorite };
}

export function createOnboardingTestHooks(settings: SettingsRepository): OnboardingTestHooks {
  return {
    refreshGateState: () => sharedRefreshGate.state.kind,
    async writeAutoBackup(json) {
      await writeAutoBackup(json);
    },
    channel: channelNamed,
    async programs(tvgId, fromMs, toMs) {
      const rows = await programRepository.window([tvgId], fromMs, toMs);
      return rows.map(({ title, startMs, endMs, description }) => ({ title, startMs, endMs, description }));
    },
    programCount: () => programRepository.count(),
    async setFavorite(name, favorite) {
      const row = (await channelRepository.visible()).find((channel) => channel.name === name);
      if (row !== undefined) await channelRepository.updateFlags(row.id, { favorite });
    },
    async setBlocked(name, blocked) {
      const row = (await channelRepository.all()).find((channel) => channel.name === name);
      if (row !== undefined) await channelRepository.updateFlags(row.id, { blocked });
    },
    async refreshPlaylist(url) {
      await updatePlaylist(url, defaultRefreshDeps(settings.get(TellySettings.CORS_PROXY)));
    },
  };
}
