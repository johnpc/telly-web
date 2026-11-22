import { describe, expect, it } from 'vitest';
import {
  ALL_CHANNELS,
  FAVORITES,
  buildRows,
  channelsIn,
  epgIdsOf,
  groupNames,
  visibleGroupNames,
} from './guideRowsBuilder';
import { HOUR, ORIGIN, channel, program } from './testFixtures';

const channels = [
  channel(1, { favorite: true, favoriteOrder: 2 }),
  channel(2, { groupTitle: 'Sports', favorite: true, favoriteOrder: 1 }),
  channel(3, { groupTitle: null, tvgId: null, epgOverride: 'other' }),
  channel(4, { groupTitle: 'Sports', tvgId: null }),
];
const custom = [{ id: 9, name: 'My Picks', members: new Set(['c1', 'http://x/4.ts|Ch 4']) }];

describe('guideRowsBuilder', () => {
  it('orders groups Favorites, All channels, playlist groups, custom groups', () => {
    expect(groupNames(channels, custom)).toEqual([FAVORITES, ALL_CHANNELS, 'News', 'Sports', 'My Picks']);
    expect(visibleGroupNames(groupNames(channels), { allChannels: false, favorites: true })).toEqual([
      FAVORITES,
      'News',
      'Sports',
    ]);
    expect(visibleGroupNames(groupNames(channels), { allChannels: true, favorites: false })).not.toContain(
      FAVORITES,
    );
  });
  it('filters channels per group, favorites in managed order, custom groups by key', () => {
    expect(channelsIn(channels, ALL_CHANNELS).map((c) => c.id)).toEqual([1, 2, 3, 4]);
    expect(channelsIn(channels, FAVORITES).map((c) => c.id)).toEqual([2, 1]);
    expect(channelsIn(channels, 'Sports').map((c) => c.id)).toEqual([2, 4]);
    expect(channelsIn(channels, 'My Picks', custom).map((c) => c.id)).toEqual([1, 4]);
    expect(channelsIn(channels, 'Nope', custom)).toEqual([]);
    expect(epgIdsOf(channels)).toEqual(['c1', 'c2', 'other']);
  });
  it('builds rows renumbered from 1 inside a group with each channel cells', () => {
    const span = { fromMs: ORIGIN, toMs: ORIGIN + HOUR };
    const programs = [program('c2', ORIGIN, ORIGIN + HOUR, 'Match')];
    const rows = buildRows(channelsIn(channels, 'Sports'), 'Sports', span, programs);
    expect(rows.map((r) => r.displayNumber)).toEqual([1, 2]);
    expect(rows[0]?.cells[0]?.program?.title).toBe('Match');
    expect(rows[1]?.cells.every((c) => c.program === null)).toBe(true);
    expect(buildRows(channels, ALL_CHANNELS, span, [])[3]?.displayNumber).toBe(4);
  });
});
