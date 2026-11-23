import { describe, expect, it } from 'vitest';
import type { ProgramRow } from '@/core/db/types';
import { NowNextCache, nowNextValidAt } from './nowNextCache';

function program(channelTvgId: string, startMs: number, endMs: number): ProgramRow {
  return {
    id: startMs,
    category: null,
    channelTvgId,
    startMs,
    endMs,
    title: `${channelTvgId}@${startMs}`,
    subTitle: null,
    description: null,
    episode: null,
  };
}

describe('nowNextValidAt', () => {
  const now = program('a', 0, 100);
  const next = program('a', 100, 200);
  it('holds while the airing programme airs and the next one has not started', () => {
    expect(nowNextValidAt({ now, next }, 50)).toBe(true);
    expect(nowNextValidAt({ now, next }, 99)).toBe(true);
    expect(nowNextValidAt({ now, next }, 100)).toBe(false);
    expect(nowNextValidAt({ now, next }, -1)).toBe(false);
  });
  it('a gap snapshot holds until the next programme starts; an empty one forever', () => {
    expect(nowNextValidAt({ now: null, next }, 50)).toBe(true);
    expect(nowNextValidAt({ now: null, next }, 100)).toBe(false);
    expect(nowNextValidAt({ now: null, next: null }, 1e12)).toBe(true);
  });
});

describe('NowNextCache', () => {
  it('answers synchronously for ids it has seen (including EPG-less ones) and refuses unknown or stale ids', () => {
    const cache = new NowNextCache();
    const a = { now: program('a', 0, 100), next: program('a', 100, 200) };
    expect(cache.read(['a'], 10)).toBeUndefined();
    cache.store(['a', 'none'], new Map([['a', a]]));
    const hit = cache.read(['a', 'none'], 10);
    expect(hit?.get('a')).toBe(a);
    expect(hit?.has('none')).toBe(false);
    expect(cache.read(['a', 'b'], 10)).toBeUndefined();
    expect(cache.read(['a'], 100)).toBeUndefined();
    expect(cache.read([], 5)?.size).toBe(0);
  });
});
