import { describe, expect, it } from 'vitest';
import type { ProgramRow } from '@/core/db/types';
import { offsetsOfMinutes, queryFrom, queryTo, shifted, windowed } from './epgOffsets';
import { programTitle, resolveNowNext } from './nowNext';

const row = (channelTvgId: string, startMs: number, endMs: number, id = 0): ProgramRow => ({
  id,
  channelTvgId,
  startMs,
  endMs,
  title: 't',
  subTitle: null,
  description: null,
  category: null,
  episode: null,
});

describe('epgOffsets', () => {
  const offsets = offsetsOfMinutes([
    { tvgId: 'a', epgOffsetMinutes: 60 },
    { tvgId: 'a', epgOffsetMinutes: 5 },
    { tvgId: 'b', epgOffsetMinutes: -30 },
  ]);
  const minute = 60_000;

  it('first channel wins a shared id; bounds pad by the extreme offsets', () => {
    expect([...offsets]).toEqual([
      ['a', 60 * minute],
      ['b', -30 * minute],
    ]);
    expect(queryFrom(1000, offsets)).toBe(1000 - 60 * minute);
    expect(queryTo(1000, offsets)).toBe(1000 + 30 * minute);
    expect(queryFrom(1000, new Map())).toBe(1000);
    expect(queryTo(1000, new Map())).toBe(1000);
  });

  it('shifts rows by their channel offset and trims to the window', () => {
    const rows = [row('a', 0, 10 * minute), row('b', 0, 10 * minute), row('c', 0, 10 * minute)];
    expect(shifted(rows, new Map())).toEqual(rows);
    expect(shifted(rows, offsets).map((r) => r.startMs)).toEqual([60 * minute, -30 * minute, 0]);
    expect(windowed(rows, offsets, 0, 5 * minute).map((r) => r.channelTvgId)).toEqual(['c']);
  });
});

describe('nowNext', () => {
  it('resolves now and next per channel from an ordered window', () => {
    const programs = [row('a', 0, 10), row('a', 10, 20), row('a', 20, 30), row('b', 50, 60)];
    const result = resolveNowNext(programs, 15);
    expect(result.get('a')).toMatchObject({ now: { startMs: 10 }, next: { startMs: 20 } });
    expect(result.get('b')).toMatchObject({ now: null, next: { startMs: 50 } });
    expect(result.has('c')).toBe(false);
  });

  it('formats programme titles like TiviMate', () => {
    expect(programTitle({ title: 'T', subTitle: null, episode: null })).toBe('T');
    expect(programTitle({ title: 'T', subTitle: 'S', episode: null })).toBe('T: S');
    expect(programTitle({ title: 'T', subTitle: ' ', episode: 'S1 E2' })).toBe('T. S1 E2');
    expect(programTitle({ title: 'T', subTitle: 'S', episode: 'S1 E2' })).toBe('T: S. S1 E2');
  });
});
