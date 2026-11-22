import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { ChannelRepository, channelRepository } from './channelRepository';
import { buildChannelRows, DEFAULT_FLAGS, DEFAULT_OVERRIDES } from './channelReplace';
import type { TellyDb } from './tellyDb';

describe('ChannelRepository', () => {
  let db: TellyDb;
  let repo: ChannelRepository;
  beforeEach(() => {
    db = freshDb();
    repo = new ChannelRepository(db);
  });
  afterEach(() => db.delete());

  it('assigns sequential numbers from playlist order and defaults flags/overrides', async () => {
    await repo.replaceForPlaylist(1, [channelImport('B'), channelImport('A')]);
    const rows = await repo.forPlaylist(1);
    expect(rows.map((r) => [r.name, r.number, r.sortIndex])).toEqual([
      ['B', 1, 0],
      ['A', 2, 1],
    ]);
    expect(rows[0]).toMatchObject({ ...DEFAULT_FLAGS, ...DEFAULT_OVERRIDES, playlistId: 1 });
    expect(await repo.totalCount()).toBe(2);
  });

  it('carries flags and overrides across a refresh by identity (tvg-id, else url|name)', async () => {
    await repo.replaceForPlaylist(1, [
      channelImport('Keep', { tvgId: 'keep.id' }),
      channelImport('NoId', { tvgId: null, streamUrl: 'http://x/noid.ts' }),
      channelImport('Gone'),
    ]);
    const [keep, noId] = await repo.forPlaylist(1);
    await repo.updateFlags(keep?.id ?? 0, { favorite: true, favoriteOrder: 3, hidden: true, blocked: true });
    await repo.updateOverrides(keep?.id ?? 0, {
      customName: 'Mine',
      epgOffsetMinutes: 30,
      epgOverride: 'o.id',
    });
    await repo.updateFlags(noId?.id ?? 0, { favorite: true });
    // Refresh: Keep changes stream URL (same tvg-id), NoId keeps url+name, a renamed NoId loses its flags.
    await repo.replaceForPlaylist(1, [
      channelImport('Keep renamed', { tvgId: 'keep.id', streamUrl: 'http://y/keep.ts' }),
      channelImport('NoId', { tvgId: null, streamUrl: 'http://x/noid.ts' }),
      channelImport('NoId', { tvgId: '', streamUrl: 'http://x/other.ts' }),
      channelImport('New'),
    ]);
    const rows = await repo.forPlaylist(1);
    expect(rows.map((r) => r.favorite)).toEqual([true, true, false, false]);
    expect(rows[0]).toMatchObject({ hidden: true, blocked: true, favoriteOrder: 3, customName: 'Mine' });
    expect(rows[0]).toMatchObject({ epgOffsetMinutes: 30, epgOverride: 'o.id', name: 'Keep renamed' });
    expect(rows.every((r) => r.id !== keep?.id)).toBe(true);
  });

  it('answers the guide/group/zap queries', async () => {
    await repo.replaceForPlaylist(1, [
      channelImport('N1', { groupTitle: 'News' }),
      channelImport('S1', { groupTitle: 'Sports' }),
      channelImport('N2', { groupTitle: 'News' }),
      channelImport('X', { groupTitle: null }),
    ]);
    await repo.replaceForPlaylist(2, [channelImport('Other', { groupTitle: 'Sports' })]);
    const [n1, s1, n2] = await repo.forPlaylist(1);
    await repo.updateFlags(n2?.id ?? 0, { hidden: true });
    await repo.updateFlags(n1?.id ?? 0, { favorite: true, favoriteOrder: 2 });
    await repo.updateFlags(s1?.id ?? 0, { favorite: true, favoriteOrder: 1 });
    expect((await repo.byGroup(1, 'News')).map((r) => r.name)).toEqual(['N1']);
    expect(await repo.groups(1)).toEqual([
      { groupTitle: 'News', channelCount: 1 },
      { groupTitle: 'Sports', channelCount: 1 },
      { groupTitle: null, channelCount: 1 },
    ]);
    expect((await repo.visible()).map((r) => r.name)).toEqual(['N1', 'Other', 'S1', 'X']);
    expect((await repo.all()).map((r) => r.name)).toEqual(['N1', 'Other', 'S1', 'N2', 'X']);
    expect((await repo.favorites()).map((r) => r.name)).toEqual(['S1', 'N1']);
    expect((await repo.byNumber(1))?.name).toBe('N1');
    expect(await repo.byNumber(3)).toBeNull();
    expect(await repo.byNumber(99)).toBeNull();
    expect((await repo.byId(n1?.id ?? 0))?.name).toBe('N1');
    expect(await repo.byId(999)).toBeNull();
  });

  it('exposes effective EPG offsets and full-row updates', async () => {
    await repo.replaceForPlaylist(1, [
      channelImport('A'),
      channelImport('B', { tvgId: null }),
      channelImport('C'),
    ]);
    const [a, b, c] = await repo.forPlaylist(1);
    if (a === undefined || b === undefined || c === undefined) throw new Error('rows');
    await repo.update({ ...a, epgOffsetMinutes: 60, epgOverride: 'alt.id' });
    await repo.updateOverrides(b.id, { epgOffsetMinutes: -30 });
    await repo.updateOverrides(c.id, { epgOffsetMinutes: 0 });
    expect(await repo.epgOffsets()).toEqual([{ tvgId: 'alt.id', epgOffsetMinutes: 60 }]);
    expect(await repo.deleteForPlaylist(1)).toBe(3);
    expect(await repo.totalCount()).toBe(0);
  });

  it('buildChannelRows is pure and the default instance targets the telly database', () => {
    expect(buildChannelRows(5, [channelImport('A')], [])).toHaveLength(1);
    expect(channelRepository).toBeInstanceOf(ChannelRepository);
  });
});
