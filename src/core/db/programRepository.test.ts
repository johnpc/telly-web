import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshDb, programImport } from '@/test/dbFixtures';
import { dedupeByStart, ProgramRepository, programRepository, titleMatches } from './programRepository';
import type { TellyDb } from './tellyDb';

describe('ProgramRepository', () => {
  let db: TellyDb;
  let repo: ProgramRepository;
  beforeEach(() => {
    db = freshDb();
    repo = new ProgramRepository(db);
  });
  afterEach(() => db.delete());

  it('replaceFor swaps the schedule of the given channels only, deduping on (channel, start)', async () => {
    await repo.replaceFor(['a', 'b'], [programImport('a', 0, 10), programImport('b', 0, 10, 'old-b')]);
    const stored = await repo.replaceFor(
      ['b'],
      [programImport('b', 0, 10, 'first'), programImport('b', 0, 10, 'last'), programImport('b', 10, 20)],
    );
    expect(stored).toBe(2);
    expect(await repo.count()).toBe(3);
    const window = await repo.window(['b', 'a'], 0, 100);
    expect(window.map((p) => [p.channelTvgId, p.startMs, p.title])).toEqual([
      ['a', 0, 'Show'],
      ['b', 0, 'last'],
      ['b', 10, 'Show'],
    ]);
    expect(await repo.channelIds()).toEqual(['a', 'b']);
  });

  it('window keeps only overlapping programmes; airingOrUpcoming drops ended ones', async () => {
    await repo.replaceFor(
      ['c'],
      [programImport('c', 0, 10), programImport('c', 10, 20), programImport('c', 20, 30)],
    );
    expect((await repo.window(['c'], 10, 20)).map((p) => p.startMs)).toEqual([10]);
    expect((await repo.window(['c'], 5, 25)).map((p) => p.startMs)).toEqual([0, 10, 20]);
    expect((await repo.airingOrUpcoming(['c'], 15)).map((p) => p.startMs)).toEqual([10, 20]);
    expect(await repo.window(['zzz'], 0, 100)).toEqual([]);
  });

  it('nowAndNext resolves the airing programme and the one after it', async () => {
    await repo.replaceFor(['c'], [programImport('c', 0, 10, 'now'), programImport('c', 10, 20, 'next')]);
    expect(await repo.nowAndNext('c', 5)).toMatchObject({ now: { title: 'now' }, next: { title: 'next' } });
    expect(await repo.nowAndNext('c', 15)).toMatchObject({ now: { title: 'next' }, next: null });
    // A gap: nothing airing, the next one upcoming.
    await repo.replaceFor(['c'], [programImport('c', 10, 20, 'later')]);
    expect(await repo.nowAndNext('c', 5)).toMatchObject({ now: null, next: { title: 'later' } });
    expect(await repo.nowAndNext('none', 5)).toEqual({ now: null, next: null });
  });

  it('prunes ended programmes by cutoff and by days', async () => {
    const day = 24 * 60 * 60 * 1000;
    await repo.replaceFor(['c'], [programImport('c', 0, day), programImport('c', 5 * day, 6 * day)]);
    expect(await repo.deleteEndedBefore(day)).toBe(0);
    expect(await repo.pruneOlderThan(2, 4 * day)).toBe(1);
    expect(await repo.pruneOlderThan(-1, 7 * day)).toBe(1);
    expect(await repo.count()).toBe(0);
  });

  it('searches titles by word prefix, soonest first, capped', async () => {
    await repo.replaceFor(
      ['a', 'b'],
      [
        programImport('a', 0, 10, 'Newsroom'),
        programImport('b', 20, 30, 'The Room'),
        programImport('a', 30, 40, 'Room Service'),
        programImport('b', 30, 40, 'Rooms to Let'),
      ],
    );
    expect((await repo.searchByTitle('room', 5, 10)).map((p) => p.title)).toEqual([
      'The Room',
      'Room Service',
      'Rooms to Let',
    ]);
    expect((await repo.searchByTitle('ROOM', 5, 1)).map((p) => p.title)).toEqual(['The Room']);
    expect(await repo.searchByTitle('room', 100, 10)).toEqual([]);
    expect(titleMatches('Newsroom', 'room')).toBe(false);
    expect(titleMatches('a Room', 'ro')).toBe(true);
  });

  it('dedupeByStart keeps the last row per (channel, start); default instance exists', () => {
    expect(dedupeByStart([programImport('a', 0, 1, 'x'), programImport('a', 0, 2, 'y')])).toEqual([
      programImport('a', 0, 2, 'y'),
    ]);
    expect(programRepository).toBeInstanceOf(ProgramRepository);
  });
});
