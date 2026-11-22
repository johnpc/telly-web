import { epgSourceRepository } from '@/core/db/epgSourceRepository';
import { playlistRepository } from '@/core/db/playlistRepository';
import { programRepository } from '@/core/db/programRepository';
import { sharedRefreshGate } from '@/core/refresh/refreshGate';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { EpgRefresher, type EpgRefresherDeps, daysToMs } from './epgRefresher';
import { defaultEpgSourceDeps, refreshEpgSource } from './epgRepository';
import { hoursToMs } from './refreshScheduler';

/**
 * Builds the production `EpgRefresher` over the settings store, the default
 * repositories and the shared gate (Android `ServiceLocator` wiring).
 * Settings are read live so Settings -> EPG changes apply to the next run.
 */
export function createEpgRefresher(
  settings: SettingsRepository,
  overrides: Partial<EpgRefresherDeps> = {},
): EpgRefresher {
  const sourceDeps = defaultEpgSourceDeps(settings.get(TellySettings.CORS_PROXY), {
    storeDescriptions: () => settings.get(TellySettings.EPG_STORE_DESCRIPTIONS),
  });
  return new EpgRefresher({
    playlists: playlistRepository,
    intervalMs: () => hoursToMs(settings.get(TellySettings.EPG_UPDATE_INTERVAL_HOURS)),
    clock: (): number => Date.now(),
    refreshSource: (url) => refreshEpgSource(url, sourceDeps),
    gate: sharedRefreshGate,
    customSources: async (playlistUrl) =>
      (await epgSourceRepository.forPlaylist(playlistUrl)).map((s) => s.url),
    keepPastMs: () => daysToMs(settings.get(TellySettings.EPG_PAST_DAYS_TO_KEEP)),
    trim: (cutoffMs) => programRepository.deleteEndedBefore(cutoffMs),
    warn: (message, cause) => console.warn(message, cause),
    info: (): void => undefined,
    ...overrides,
  });
}
