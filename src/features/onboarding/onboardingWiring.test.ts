import { describe, expect, it, vi } from 'vitest';
import { StartRoute } from '@/app/startRoute';
import { ChannelRepository } from '@/core/db/channelRepository';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { Navigator } from '@/core/navigation/navigator';
import { encodeBackup } from '@/core/settings/backupCodec';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { EpgRefresher } from '@/features/epg/epgRefresher';
import { parseM3u } from '@/features/playlist/m3uParser';
import { freshDb } from '@/test/dbFixtures';
import {
  type OnboardingStores,
  createRestoreRunner,
  createWizardDeps,
  kickEpgRefresh,
  landAfterRestore,
  probeRestoreOffer,
} from './onboardingWiring';

const body =
  '#EXTM3U url-tvg="http://h/epg.xml"\n#EXTINF:-1 tvg-id="a" group-title="News",News One\nhttp://h/1.ts\n' +
  '#EXTINF:-1 group-title="Movies",Film\nhttp://h/film.mp4\n';

function harness(): { stores: OnboardingStores; settings: SettingsRepository; fetched: string[] } {
  const db = freshDb();
  const fetched: string[] = [];
  const stores: OnboardingStores = {
    playlists: new PlaylistRepository(db),
    channels: new ChannelRepository(db),
    clock: () => 1_000,
    fetchText: (url, proxyBase) => {
      fetched.push(`${proxyBase}|${url}`);
      return url.endsWith('.m3u') ? Promise.resolve(body) : Promise.reject(new Error('404'));
    },
  };
  return { stores, settings: new SettingsRepository(new MemoryKeyValueStore()), fetched };
}

describe('onboardingWiring', () => {
  it('createWizardDeps fetches through the CORS proxy setting and persists live + VOD rows', async () => {
    const { stores, settings, fetched } = harness();
    settings.set(TellySettings.CORS_PROXY, 'https://proxy/?u=');
    const deps = createWizardDeps(settings, stores);
    expect(await deps.fetchPlaylist('http://h/p.m3u')).toBe(body);
    expect(fetched).toEqual(['https://proxy/?u=|http://h/p.m3u']);
    await deps.persist('http://h/p.m3u', { ...parseM3u(body), epgUrl: 'http://h/other.xml' }, 'Mine');
    const [row] = await stores.playlists.all();
    expect(row).toMatchObject({ name: 'Mine', url: 'http://h/p.m3u', epgUrl: 'http://h/other.xml' });
    expect(await stores.channels.totalCount()).toBe(1);
  });

  it('createRestoreRunner imports settings + identities, re-fetches and lands on channels', async () => {
    const { stores, settings, fetched } = harness();
    settings.set(TellySettings.CONFIRM_EXIT, true);
    const json = encodeBackup({
      version: 1,
      settings: { general_pip_on_home: 'true' },
      playlists: [{ name: 'host', url: 'http://h/p.m3u', epgUrl: 'http://h/epg.xml' }],
    });
    expect(await createRestoreRunner(settings, stores).restore(json)).toBe(true);
    expect(settings.get(TellySettings.PIP_ON_HOME)).toBe(true);
    expect(settings.get(TellySettings.CONFIRM_EXIT)).toBe(false);
    expect(fetched).toEqual(['|http://h/p.m3u']);
    expect(await stores.channels.totalCount()).toBe(1);
    expect(await createRestoreRunner(settings, stores).restore('garbage')).toBe(false);
  });

  it('a restore whose playlists cannot be fetched fails honestly', async () => {
    const { stores, settings } = harness();
    const json = encodeBackup({
      version: 1,
      settings: {},
      playlists: [{ name: 'x', url: 'http://h/dead.txt', epgUrl: null }],
    });
    expect(await createRestoreRunner(settings, stores).restore(json)).toBe(false);
    expect((await stores.playlists.all()).map((p) => p.url)).toEqual(['http://h/dead.txt']);
  });

  it('probeRestoreOffer offers a readable backup and treats errors/absence as none', async () => {
    const json = encodeBackup({ version: 1, settings: {}, playlists: [] });
    expect(await probeRestoreOffer(() => Promise.resolve(json))).toEqual({ kind: 'Ready', json });
    expect(await probeRestoreOffer(() => Promise.resolve(null))).toEqual({ kind: 'None' });
    expect(await probeRestoreOffer(() => Promise.reject(new Error('opfs')))).toEqual({ kind: 'None' });
    expect(await probeRestoreOffer()).toEqual({ kind: 'None' });
  });

  it('landAfterRestore applies the cold-start policy to the channel count', async () => {
    const { stores } = harness();
    const replaceAll = vi.fn();
    const navigator = { replaceAll } as unknown as Navigator;
    landAfterRestore(navigator, new StartRoute(() => true), stores.channels);
    await vi.waitFor(() => expect(replaceAll).toHaveBeenCalledWith({ kind: 'Welcome' }));
  });

  it('kickEpgRefresh fires the forced refresh and only warns on failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const refreshAllNow = vi.fn(() => Promise.reject(new Error('offline')));
    const { settings } = harness();
    kickEpgRefresh(settings, () => ({ refreshAllNow }) as unknown as EpgRefresher);
    expect(refreshAllNow).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
