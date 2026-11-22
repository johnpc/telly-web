import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { defaultPlaylistName, PlaylistRepository, playlistRepository } from './playlistRepository';
import type { TellyDb } from './tellyDb';

const vod = (name: string) => ({
  itemKey: `http://x/${name}.mp4|${name}`,
  name,
  groupTitle: 'Cinema',
  logoUrl: null,
  streamUrl: `http://x/${name}.mp4`,
});

describe('PlaylistRepository', () => {
  let db: TellyDb;
  let repo: PlaylistRepository;
  beforeEach(() => {
    db = freshDb();
    repo = new PlaylistRepository(db);
  });
  afterEach(() => db.delete());

  it('add inserts the row, channels and VOD items in one go and stamps lastUpdatedMs', async () => {
    const counts = await repo.add(
      'http://p/list.m3u',
      {
        epgUrl: 'http://p/epg.xml',
        channels: [channelImport('A'), channelImport('B')],
        vodItems: [vod('m')],
      },
      null,
      () => 1000,
    );
    expect(counts).toEqual({ playlistId: 1, channels: 2, vodItems: 1 });
    const row = await repo.byUrl('http://p/list.m3u');
    expect(row).toMatchObject({ name: 'list.m3u', epgUrl: 'http://p/epg.xml', lastUpdatedMs: 1000 });
    expect(row).toMatchObject({ epgLastUpdatedMs: 0, epgFailedAtMs: 0 });
    expect(await db.channels.count()).toBe(2);
    expect(await db.vod_items.count()).toBe(1);
  });

  it('re-adding the same URL keeps the id, name and EPG stamps; an explicit name renames', async () => {
    await repo.add('http://p/l', { epgUrl: null, channels: [], vodItems: [] }, 'Home', () => 1);
    await repo.markEpgUpdated(1, 50);
    await repo.add(
      'http://p/l',
      { epgUrl: 'http://e', channels: [channelImport('A')], vodItems: [] },
      null,
      () => 2,
    );
    expect(await repo.byId(1)).toMatchObject({
      name: 'Home',
      epgUrl: 'http://e',
      lastUpdatedMs: 2,
      epgLastUpdatedMs: 50,
    });
    await repo.add('http://p/l', { epgUrl: null, channels: [], vodItems: [] }, 'Renamed', () => 3);
    expect((await repo.all()).map((p) => [p.id, p.name])).toEqual([[1, 'Renamed']]);
  });

  it('marks EPG success/failure, renames and re-keys URLs', async () => {
    await repo.add('http://a', { epgUrl: null, channels: [], vodItems: [] }, null, () => 1);
    await repo.add('http://b', { epgUrl: null, channels: [], vodItems: [] }, null, () => 1);
    await repo.markEpgFailed(1, 7);
    expect(await repo.byId(1)).toMatchObject({ epgFailedAtMs: 7 });
    await repo.markEpgUpdated(1, 9);
    expect(await repo.byId(1)).toMatchObject({ epgLastUpdatedMs: 9, epgFailedAtMs: 0 });
    expect(await repo.rename('http://a', 'A!')).toBe(1);
    expect((await repo.byUrl('http://a'))?.name).toBe('A!');
    expect(await repo.changeUrl('http://a', 'http://b')).toBe(false);
    expect(await repo.changeUrl('http://zzz', 'http://c')).toBe(false);
    expect(await repo.changeUrl('http://a', 'http://c')).toBe(true);
    expect((await repo.byUrl('http://c'))?.id).toBe(1);
    expect(await repo.byUrl('http://a')).toBeNull();
    expect(await repo.byId(99)).toBeNull();
  });

  it('resolves the owning playlist of a live or VOD stream', async () => {
    await repo.add(
      'http://p',
      { epgUrl: null, channels: [channelImport('A')], vodItems: [vod('m')] },
      null,
      () => 1,
    );
    expect(await repo.playlistUrlForStream('http://x/a.ts')).toBe('http://p');
    expect(await repo.playlistUrlForStream('http://x/m.mp4')).toBe('http://p');
    expect(await repo.playlistUrlForStream('http://nope')).toBeNull();
  });

  it('remove cascades to channels and VOD items; unknown URLs are a no-op', async () => {
    await repo.add(
      'http://p',
      { epgUrl: null, channels: [channelImport('A')], vodItems: [vod('m')] },
      null,
      () => 1,
    );
    await repo.add('http://q', { epgUrl: null, channels: [channelImport('B')], vodItems: [] }, null, () => 1);
    await repo.remove('http://p');
    await repo.remove('http://missing');
    expect((await repo.all()).map((p) => p.url)).toEqual(['http://q']);
    expect(await db.channels.count()).toBe(1);
    expect(await db.vod_items.count()).toBe(0);
  });

  it('derives default names from the URL path', () => {
    expect(defaultPlaylistName('http://h/a/b.m3u?x=1')).toBe('b.m3u');
    expect(defaultPlaylistName('http://h/a/')).toBe('a');
    expect(defaultPlaylistName('http://h')).toBe('h');
    expect(defaultPlaylistName('/')).toBe('/');
    expect(playlistRepository).toBeInstanceOf(PlaylistRepository);
  });
});
