import { afterEach, describe, expect, it, vi } from 'vitest';
import { channelRepository } from '@/core/db/channelRepository';
import { programRepository } from '@/core/db/programRepository';
import { tellyDb } from '@/core/db/tellyDb';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { importPlaylist } from '@/features/playlist/channelImporter';
import { programImport } from '@/test/dbFixtures';
import { createOnboardingTestHooks } from './onboardingTestHooks';

const url = 'http://h/p.m3u';
const body = '#EXTM3U\n#EXTINF:-1 tvg-id="news.id" group-title="News",News One\nhttp://h/1.ts\n';

describe('onboarding test hooks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads channels, programmes and the gate like the Android steps read Room', async () => {
    const hooks = createOnboardingTestHooks(new SettingsRepository(new MemoryKeyValueStore()));
    await importPlaylist(url, body);
    await programRepository.replaceFor(['news.id'], [programImport('news.id', 10, 20, 'Show')]);
    expect(hooks.refreshGateState()).toBe('Idle');
    expect(await hooks.channel('News One')).toEqual({ tvgId: 'news.id', number: 1, favorite: false });
    expect(await hooks.channel('Nobody')).toBeNull();
    expect(await hooks.programs('news.id', 0, 100)).toEqual([
      { title: 'Show', startMs: 10, endMs: 20, description: null },
    ]);
    expect(await hooks.programCount()).toBe(1);
    await hooks.setFavorite('News One', true);
    await hooks.setFavorite('Nobody', true);
    expect((await hooks.channel('News One'))?.favorite).toBe(true);
    await expect(hooks.writeAutoBackup('{}')).resolves.toBeUndefined();
  });

  it('refreshPlaylist re-imports the stored URL through the playlist refresher', async () => {
    const hooks = createOnboardingTestHooks(new SettingsRepository(new MemoryKeyValueStore()));
    await importPlaylist(url, body);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(`${body}#EXTINF:-1,Two\nhttp://h/2.ts\n`))),
    );
    await hooks.refreshPlaylist(url);
    expect(await channelRepository.totalCount()).toBe(2);
    await tellyDb.delete();
  });
});
