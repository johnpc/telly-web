import { describe, expect, it } from 'vitest';
import { EpgSourceRepository } from '@/core/db/epgSourceRepository';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { playlistUserAgentSetting } from '@/features/playlist/playlistSettings';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { changePlaylistUrl } from './playlistUrlChanger';

const OLD = 'http://p/old.m3u';
const NEW = 'http://p/new.m3u';
const M3U =
  '#EXTM3U\n#EXTINF:-1 tvg-id="a" group-title="News",Alpha\nhttp://s/a.ts\n#EXTINF:-1 tvg-id="b",Beta\nhttp://s/b.ts\n';

describe('changePlaylistUrl', () => {
  it('fetches the new URL first, re-keys the row, its sources and settings, then re-imports', async () => {
    const db = freshDb();
    const playlists = new PlaylistRepository(db);
    const epgSources = new EpgSourceRepository(db);
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(playlistUserAgentSetting(OLD), 'ua');
    await playlists.add(
      OLD,
      { epgUrl: null, channels: [channelImport('Alpha')], vodItems: [] },
      'Mine',
      () => 1,
    );
    await epgSources.add(OLD, 'http://alt/epg.xml', 1);
    const fetched: string[] = [];
    const deps = {
      fetchText: async (url: string) => (fetched.push(url), M3U),
      playlists,
      epgSources,
      settings,
      clock: () => 5,
    };
    expect(await changePlaylistUrl(OLD, NEW, deps)).toBe(true);
    expect(fetched).toEqual([NEW]);
    expect(await playlists.byUrl(OLD)).toBeNull();
    const moved = await playlists.byUrl(NEW);
    expect(moved).toMatchObject({ name: 'Mine', lastUpdatedMs: 5 });
    expect(
      await db.channels
        .where('playlistId')
        .equals(moved?.id ?? -1)
        .count(),
    ).toBe(2);
    expect((await epgSources.forPlaylist(NEW)).map((s) => s.url)).toEqual(['http://alt/epg.xml']);
    expect(settings.get(playlistUserAgentSetting(NEW))).toBe('ua');
    expect(settings.snapshot()[playlistUserAgentSetting(OLD).key]).toBeUndefined();
  });

  it('keeps the old URL when the playlist is unknown, the fetch fails or the new URL is taken', async () => {
    const db = freshDb();
    const playlists = new PlaylistRepository(db);
    const base = {
      playlists,
      epgSources: new EpgSourceRepository(db),
      settings: new SettingsRepository(new MemoryKeyValueStore()),
    };
    expect(await changePlaylistUrl(OLD, NEW, { ...base, fetchText: async () => M3U })).toBe(false);
    await playlists.add(OLD, { epgUrl: null, channels: [], vodItems: [] }, null, () => 1);
    expect(
      await changePlaylistUrl(OLD, NEW, {
        ...base,
        fetchText: async () => {
          throw new Error('404');
        },
      }),
    ).toBe(false);
    await playlists.add(NEW, { epgUrl: null, channels: [], vodItems: [] }, null, () => 1);
    expect(await changePlaylistUrl(OLD, NEW, { ...base, fetchText: async () => M3U })).toBe(false);
    expect(await playlists.byUrl(OLD)).not.toBeNull();
  });
});
