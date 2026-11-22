import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { VodRepository } from '@/core/db/vodRepository';
import { fixtureText } from '@/test/fixtureSite';
import { freshDb } from '@/test/dbFixtures';
import { classifyEntries, identityOf, importPlaylist, keyOf, toChannelImport } from './channelImporter';
import { parseM3u } from './m3uParser';
import { isVod, vodItemKey } from './vodClassifier';

describe('vodClassifier', () => {
  it('classifies by video-file extension, ignoring the query string and case', () => {
    expect(isVod('http://x/movie.MP4?token=1')).toBe(true);
    expect(isVod('http://x/movie.mkv')).toBe(true);
    expect(isVod('http://x/live.ts')).toBe(false);
    expect(isVod('http://x/live.m3u8')).toBe(false);
    expect(isVod('http://x/live')).toBe(false);
    expect(vodItemKey('u', 'n')).toBe('u|n');
  });
});

describe('importPlaylist', () => {
  let db: TellyDb;
  beforeEach(() => {
    db = freshDb();
  });
  afterEach(() => db.delete());

  it('imports the fixture: 31 live channels numbered in order, 2 VOD items, epg hint, lastUpdated stamp', async () => {
    const playlists = new PlaylistRepository(db);
    const result = await importPlaylist('http://127.0.0.1:8090/playlist.m3u', fixtureText('playlist.m3u'), {
      playlists,
      clock: () => 4242,
    });
    expect(result).toEqual({
      playlistId: 1,
      channels: 31,
      vodItems: 2,
      epgUrl: 'http://127.0.0.1:8090/epg.xml',
    });
    const channels = await new ChannelRepository(db).forPlaylist(1);
    expect(channels.map((c) => c.number)).toEqual(channels.map((_, i) => i + 1));
    expect(channels[0]).toMatchObject({
      name: 'News One',
      catchupType: 'default',
      catchupDays: 2,
      tvgId: 'news-one-1.fixture',
    });
    const vod = await new VodRepository(db).items();
    expect(vod.map((v) => v.name)).toEqual(['Big Buck Bunny', 'Sintel']);
    expect(vod[0]).toMatchObject({
      groupTitle: 'Cinema',
      itemKey: 'http://127.0.0.1:8090/streams/vod-sample.mp4|Big Buck Bunny',
    });
    expect(await playlists.byId(1)).toMatchObject({ name: 'playlist.m3u', lastUpdatedMs: 4242 });
  });

  it('honours an explicit name and the default repository/clock', async () => {
    const playlists = new PlaylistRepository(db);
    await importPlaylist('http://p/l', '#EXTM3U\n#EXTINF:-1,A\nhttp://s/a.ts\n', { playlists, name: 'Home' });
    const row = await playlists.byUrl('http://p/l');
    expect(row?.name).toBe('Home');
    expect(row?.lastUpdatedMs).toBeGreaterThan(0);
  });

  it('maps entries and exposes the identity helpers', () => {
    const parsed = parseM3u('#EXTM3U\n#EXTINF:-1 tvg-id="a" tvg-logo="l" group-title="g",A\nhttp://s/a.ts\n');
    const channel = parsed.channels[0];
    if (channel === undefined) throw new Error('parse');
    expect(toChannelImport(channel)).toEqual({
      name: 'A',
      groupTitle: 'g',
      logoUrl: 'l',
      streamUrl: 'http://s/a.ts',
      tvgId: 'a',
      catchupType: null,
      catchupSource: null,
      catchupDays: null,
    });
    expect(classifyEntries(parsed.channels)).toEqual({ live: [toChannelImport(channel)], vod: [] });
    expect(identityOf('a', 'u', 'n')).toBe('a');
    expect(keyOf({ tvgId: null, streamUrl: 'u', name: 'n' })).toBe('u|n');
  });
});
