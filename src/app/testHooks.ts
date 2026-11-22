import { channelRepository } from '@/core/db/channelRepository';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { createEpgRefresher } from '@/features/epg/epgWiring';
import { importPlaylist } from '@/features/playlist/channelImporter';
import { fetchPlaylistText } from '@/features/playlist/playlistFetcher';

/** Test seams exposed on `window.telly` when the page is opened with `?e2e=1` or in dev. */
export interface TellyTestHooks {
  completeSetup(playlistUrl: string): Promise<void>;
  setSetting(key: string, value: string): void;
  channelCount(): Promise<number>;
  now(): number;
}

export function isTestMode(search: string, dev: boolean): boolean {
  return dev || new URLSearchParams(search).has('e2e');
}

/** The wizard's end state without the wizard: import the playlist, refresh its EPG. */
export function createTestHooks(settings: SettingsRepository): TellyTestHooks {
  return {
    async completeSetup(playlistUrl) {
      const text = await fetchPlaylistText(playlistUrl, {
        proxyBase: settings.get(TellySettings.CORS_PROXY),
      });
      await importPlaylist(playlistUrl, text);
      await createEpgRefresher(settings).refreshAllNow();
    },
    setSetting(key, value) {
      settings.writeRaw(key, value);
    },
    channelCount: () => channelRepository.totalCount(),
    now: () => Date.now(),
  };
}

export function installTestHooks(settings: SettingsRepository): void {
  if (!isTestMode(window.location.search, import.meta.env.DEV)) return;
  window.telly = createTestHooks(settings);
}

declare global {
  interface Window {
    telly: TellyTestHooks;
  }
}
