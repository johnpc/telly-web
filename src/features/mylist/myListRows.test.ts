import { describe, expect, it } from 'vitest';
import type { ChannelRow, MyListRow } from '@/core/db/types';
import { myListRowId, myListRows } from './myListRows';

const NOW = new Date(2026, 8, 13, 14, 45).getTime();
const channels = [
  { id: 1, name: 'News One', tvgId: 'a', streamUrl: 'http://x/1' },
  { id: 2, name: 'News One HD', tvgId: 'b', streamUrl: 'http://x/2' },
  { id: 3, name: 'Dup', tvgId: 'a', streamUrl: 'http://x/3' },
] as ChannelRow[];
const entry = (channelKey: string, startMs: number, endMs: number): MyListRow => ({
  channelKey,
  startMs,
  endMs,
  title: 't',
  description: null,
  addedAtMs: 0,
});

describe('myListRows', () => {
  it('resolves channels by identity, hides ended entries and unknown channels, flags airing rows', () => {
    const rows = myListRows(
      [
        entry('b', NOW + 60_000, NOW + 120_000),
        entry('a', NOW - 60_000, NOW + 60_000),
        entry('a', NOW - 120_000, NOW - 1),
        entry('zzz', NOW, NOW + 1),
      ],
      channels,
      NOW,
    );
    expect(rows.map((row) => [row.channel.id, row.airing])).toEqual([
      [2, false],
      [1, true],
    ]);
    expect(rows[0]?.airTimeText).toBe('Sun, Sep 13, 2:46 PM');
    expect(myListRowId(rows[0] as NonNullable<(typeof rows)[0]>)).toBe(`mylist-b-${NOW + 60_000}`);
  });
});
