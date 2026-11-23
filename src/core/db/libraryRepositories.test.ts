import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import { CustomGroupRepository, customGroupRepository } from './customGroupRepository';
import { EpgSourceRepository, epgSourceName, epgSourceRepository } from './epgSourceRepository';
import { MyListRepository, myListRepository } from './myListRepository';
import { RecordingRepository, recordingRepository } from './recordingRepository';
import { ReminderRepository, reminderRepository } from './reminderRepository';
import type { TellyDb } from './tellyDb';
import { VodRepository, vodRepository } from './vodRepository';
import { WatchHistoryRepository, watchHistoryRepository } from './watchHistoryRepository';

let db: TellyDb;
beforeEach(() => {
  db = freshDb();
});
afterEach(() => db.delete());

describe('EpgSourceRepository', () => {
  it('orders by added time, replaces duplicates, edits, removes and re-keys', async () => {
    const repo = new EpgSourceRepository(db);
    await repo.add('http://p', 'http://e2', 20);
    const first = await repo.add('http://p', 'http://e1', 10);
    await repo.add('http://q', 'http://e1', 15);
    expect(await repo.add('http://p', 'http://e1', 30)).toBe(first);
    expect((await repo.all()).map((s) => [s.playlistUrl, s.url, s.addedAtMs])).toEqual([
      ['http://q', 'http://e1', 15],
      ['http://p', 'http://e2', 20],
      ['http://p', 'http://e1', 30],
    ]);
    expect((await repo.forPlaylist('http://p')).map((s) => s.url)).toEqual(['http://e2', 'http://e1']);
    await repo.setUrl(first, 'http://e9');
    await repo.remove(1);
    expect(await repo.rekeyPlaylist('http://p', 'http://r')).toBe(1);
    expect((await repo.forPlaylist('http://r')).map((s) => s.url)).toEqual(['http://e9']);
    expect(epgSourceName('https://epg.example.com:8080/guide.xml.gz')).toBe('epg.example.com');
    expect(epgSourceName('nohost')).toBe('nohost');
    expect(epgSourceName('http:///x')).toBe('http:///x');
    expect(epgSourceRepository).toBeInstanceOf(EpgSourceRepository);
  });
});

describe('WatchHistoryRepository', () => {
  it('dedupes per channel, lists newest first, trims and clears', async () => {
    const repo = new WatchHistoryRepository(db);
    await repo.upsert({ channelKey: 'a', watchedAtMs: 1 });
    await repo.upsert({ channelKey: 'b', watchedAtMs: 2 });
    await repo.upsert({ channelKey: 'c', watchedAtMs: 2 });
    await repo.upsert({ channelKey: 'a', watchedAtMs: 3 });
    expect((await repo.events()).map((e) => e.channelKey)).toEqual(['a', 'b', 'c']);
    await repo.trimTo(2);
    expect((await repo.events()).map((e) => e.channelKey)).toEqual(['a', 'b']);
    await repo.clear();
    expect(await repo.events()).toEqual([]);
    expect(watchHistoryRepository).toBeInstanceOf(WatchHistoryRepository);
  });
});

describe('MyListRepository', () => {
  it('dedupes per airing and lists most recently added first', async () => {
    const repo = new MyListRepository(db);
    const row = (channelKey: string, startMs: number, addedAtMs: number) => ({
      channelKey,
      startMs,
      endMs: startMs + 1,
      title: 't',
      description: null,
      addedAtMs,
    });
    await repo.upsert(row('a', 1, 1));
    await repo.upsert(row('b', 1, 2));
    await repo.upsert(row('a', 2, 2));
    await repo.upsert(row('a', 1, 5));
    expect((await repo.all()).map((e) => [e.channelKey, e.startMs])).toEqual([
      ['a', 1],
      ['a', 2],
      ['b', 1],
    ]);
    expect(await repo.find('a', 2)).toMatchObject({ addedAtMs: 2 });
    await repo.remove('a', 2);
    expect(await repo.find('a', 2)).toBeNull();
    expect(myListRepository).toBeInstanceOf(MyListRepository);
  });
});

describe('ReminderRepository', () => {
  it('replaces on (channel, start, title), fires exactly once, finds and removes', async () => {
    const repo = new ReminderRepository(db);
    const id = await repo.upsert({ channelId: 1, title: 'T', startMs: 10, stopMs: 20 });
    expect(await repo.upsert({ channelId: 1, title: 'T', startMs: 10, stopMs: 25 })).toBe(id);
    await repo.upsert({ channelId: 1, title: 'Early', startMs: 5, stopMs: 6, firedAtMs: 0 });
    expect((await repo.upcoming()).map((r) => r.title)).toEqual(['Early', 'T']);
    expect(await repo.markFired(id, 99)).toBe(1);
    expect(await repo.markFired(id, 100)).toBe(0);
    expect(await repo.find(1, 10, 'T')).toMatchObject({ firedAtMs: 99, stopMs: 25 });
    expect(await repo.find(1, 10, 'nope')).toBeNull();
    await repo.remove(id);
    expect((await repo.upcoming()).map((r) => r.title)).toEqual(['Early']);
    expect(reminderRepository).toBeInstanceOf(ReminderRepository);
  });
});

describe('RecordingRepository', () => {
  const rec = (status: string, startMs: number) => ({
    channelKey: 'k',
    channelName: 'K',
    streamUrl: 'http://s',
    title: 't',
    filePath: '/f',
    startMs,
    plannedEndMs: startMs + 10,
    endMs: null,
    status,
    sizeBytes: 0,
  });

  it('lists, schedules and transitions status conditionally', async () => {
    const repo = new RecordingRepository(db);
    const a = await repo.insert(rec('SCHEDULED', 20));
    const b = await repo.insert(rec('SCHEDULED', 10));
    const c = await repo.insert(rec('DONE', 30));
    expect((await repo.all()).map((r) => r.id)).toEqual([c, a, b]);
    expect((await repo.scheduled()).map((r) => r.id)).toEqual([b, a]);
    expect((await repo.byStatus('DONE')).map((r) => r.id)).toEqual([c]);
    expect(await repo.countPlanned('k', 10)).toBe(1);
    expect(await repo.countPlanned('k', 30)).toBe(0);
    expect(await repo.markStarted(b, 'RECORDING', 11)).toBe(1);
    expect(await repo.markStarted(b, 'RECORDING', 12)).toBe(0);
    expect(await repo.finish(b, ['SCHEDULED'], 'DONE', 50, 1)).toBe(0);
    expect(await repo.finish(b, ['RECORDING', 'STOPPING'], 'DONE', 50, 1)).toBe(1);
    expect(await repo.byId(b)).toMatchObject({ status: 'DONE', endMs: 50, sizeBytes: 1, startMs: 11 });
    await repo.remove(c);
    expect(await repo.byId(c)).toBeNull();
    await repo.removeAll();
    expect(await repo.all()).toEqual([]);
    expect(recordingRepository).toBeInstanceOf(RecordingRepository);
  });
});

describe('VodRepository', () => {
  it('stores items per playlist and resume positions by key', async () => {
    const repo = new VodRepository(db);
    const item = (name: string) => ({
      itemKey: `u|${name}`,
      name,
      groupTitle: null,
      logoUrl: null,
      streamUrl: 'u',
    });
    expect(await repo.replaceForPlaylist(1, [item('b'), item('a')])).toBe(2);
    await repo.replaceForPlaylist(1, [item('c')]);
    expect((await repo.items()).map((i) => [i.name, i.sortIndex])).toEqual([['c', 0]]);
    expect(await repo.itemCount()).toBe(1);
    expect((await repo.itemByKey('u|c'))?.name).toBe('c');
    expect(await repo.itemByKey('u|zzz')).toBeNull();
    await repo.savePosition({ itemKey: 'u|c', positionMs: 5, durationMs: 10, updatedAtMs: 1 });
    expect(await repo.positionByKey('u|c')).toMatchObject({ positionMs: 5 });
    expect(await repo.positions()).toHaveLength(1);
    await repo.removePosition('u|c');
    expect(await repo.positionByKey('u|c')).toBeNull();
    await repo.savePosition({ itemKey: 'x', positionMs: 1, durationMs: 2, updatedAtMs: 3 });
    await repo.clearPositions();
    expect(await repo.positions()).toEqual([]);
    expect(vodRepository).toBeInstanceOf(VodRepository);
  });
});

describe('CustomGroupRepository', () => {
  it('appends groups, manages membership, deletes with cascade', async () => {
    const repo = new CustomGroupRepository(db);
    expect(await repo.maxSortIndex()).toBe(-1);
    const kids = await repo.insertGroup('Kids');
    const docs = await repo.insertGroup('Docs');
    expect((await repo.groups()).map((g) => [g.name, g.sortIndex])).toEqual([
      ['Kids', 0],
      ['Docs', 1],
    ]);
    await repo.renameGroup(docs, 'Documentaries');
    await repo.insertMembers([
      { groupId: kids, channelKey: 'a' },
      { groupId: docs, channelKey: 'b' },
    ]);
    await repo.insertMembers([{ groupId: kids, channelKey: 'a' }]);
    expect(await repo.members()).toHaveLength(2);
    await repo.removeMember(docs, 'b');
    await repo.insertMembers([{ groupId: docs, channelKey: 'c' }]);
    await repo.deleteGroup(kids);
    expect((await repo.groups()).map((g) => g.name)).toEqual(['Documentaries']);
    expect(await repo.members()).toEqual([{ groupId: docs, channelKey: 'c' }]);
    expect(customGroupRepository).toBeInstanceOf(CustomGroupRepository);
  });
});
