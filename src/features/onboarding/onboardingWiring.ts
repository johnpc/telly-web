import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type PlaylistRepository, playlistRepository } from '@/core/db/playlistRepository';
import type { Navigator } from '@/core/navigation/navigator';
import { decodeBackup } from '@/core/settings/backupCodec';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { StartRoute } from '@/app/startRoute';
import { createEpgRefresher } from '@/features/epg/epgWiring';
import { classifyEntries } from '@/features/playlist/channelImporter';
import { fetchPlaylistText } from '@/features/playlist/playlistFetcher';
import { defaultRefreshDeps, tryUpdatePlaylist } from '@/features/playlist/playlistRefresh';
import { readAutoBackup } from '@/features/settings/backup/autoBackupFile';
import type { WizardDeps } from './addPlaylistViewModel';
import { RestoreRunner } from './restoreRunner';
import { type RestoreOffer, offerOf } from './welcomeRestore';

/** Repositories the onboarding flows write; tests pass their own database's. */
export interface OnboardingStores {
  playlists: PlaylistRepository;
  channels: ChannelRepository;
  clock: () => number;
  fetchText: (url: string, proxyBase: string) => Promise<string>;
}

export const defaultOnboardingStores: OnboardingStores = {
  playlists: playlistRepository,
  channels: channelRepository,
  clock: (): number => Date.now(),
  fetchText: (url, proxyBase) => fetchPlaylistText(url, { proxyBase }),
};

/** The wizard over the real fetcher (CORS proxy honoured) and playlist store. */
export function createWizardDeps(
  settings: SettingsRepository,
  stores: OnboardingStores = defaultOnboardingStores,
): WizardDeps {
  return {
    fetchPlaylist: (url) => stores.fetchText(url, settings.get(TellySettings.CORS_PROXY)),
    persist: async (sourceUrl, playlist, name) => {
      const { live, vod } = classifyEntries(playlist.channels);
      const rows = { epgUrl: playlist.epgUrl, channels: live, vodItems: vod };
      await stores.playlists.add(sourceUrl, rows, name, stores.clock);
    },
  };
}

/** Done: the EPG of the new playlist is fetched right away, fire-and-forget. */
export function kickEpgRefresh(settings: SettingsRepository, refresh = createEpgRefresher): void {
  void refresh(settings)
    .refreshAllNow()
    .catch((error: unknown) => console.warn('EPG refresh after setup failed', error));
}

/** Android `SettingsBackupManager.importJson`: settings + playlist identities, zero channels. */
async function importBackup(
  json: string,
  settings: SettingsRepository,
  stores: OnboardingStores,
): Promise<boolean> {
  const payload = decodeBackup(json);
  if (payload === null) return false;
  settings.restore(payload.settings);
  for (const entry of payload.playlists) {
    const empty = { epgUrl: entry.epgUrl, channels: [], vodItems: [] };
    await stores.playlists.add(entry.url, empty, entry.name, stores.clock);
  }
  return true;
}

/** "Update playlist" for every restored URL, through the shared refresh gate. */
async function refetchPlaylists(
  urls: string[],
  settings: SettingsRepository,
  stores: OnboardingStores,
): Promise<void> {
  const proxyBase = settings.get(TellySettings.CORS_PROXY);
  const deps = defaultRefreshDeps(proxyBase, {
    fetchText: (url) => stores.fetchText(url, proxyBase),
    playlists: stores.playlists,
    clock: stores.clock,
  });
  for (const url of urls) await tryUpdatePlaylist(url, deps);
}

/** The welcome screen's restore: import the backup, re-fetch its playlists, count channels. */
export function createRestoreRunner(
  settings: SettingsRepository,
  stores: OnboardingStores = defaultOnboardingStores,
): RestoreRunner {
  return new RestoreRunner({
    importJson: (json) => importBackup(json, settings, stores),
    playlistUrls: async () => (await stores.playlists.all()).map((row) => row.url),
    updatePlaylists: (urls) => refetchPlaylists(urls, settings, stores),
    channelCount: () => stores.channels.totalCount(),
  });
}

/** The welcome probe: a readable backup in OPFS offers itself; nothing else exists on the web. */
export async function probeRestoreOffer(
  read = (): Promise<string | null> => readAutoBackup(),
): Promise<RestoreOffer> {
  const json = await read().catch((): null => null);
  return offerOf(json, false, false);
}

/** Leaves the welcome screen per the cold-start policy once channels exist. */
export function landAfterRestore(
  navigator: Navigator,
  startRoute: StartRoute,
  channels: ChannelRepository = channelRepository,
): void {
  void channels.totalCount().then((count) => navigator.replaceAll(startRoute.forChannelCount(count)));
}
