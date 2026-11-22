import { describe, expect, it } from 'vitest';
import {
  ALL_CHANNELS,
  FAVORITES,
  channelsIn,
  groupNames,
  toCustomGroups,
  visibleGroups,
} from './panelGroups';
import { buildRows, epgIdsOf } from './panelRows';
import { testChannel, testProgram } from './testChannels';

const at = (h: number, m: number): number => Date.UTC(2026, 8, 13, h, m);
const style = { is24h: false, timeZone: 'UTC' };
const channels = [
  testChannel(1, 'News One', 'News'),
  testChannel(2, 'News Two', 'News'),
  testChannel(3, 'Sports Arena', 'Sports', { favorite: true, favoriteOrder: 2 }),
  testChannel(4, 'Sports Extra', 'Sports', { favorite: true, favoriteOrder: 1 }),
  testChannel(5, 'Music Box', 'Music', { epgOverride: 'tvg-1' }),
  testChannel(6, 'Loose', 'Music', { groupTitle: null, tvgId: null }),
];
const custom = toCustomGroups(
  [{ id: 7, name: 'My Picks', sortIndex: 0 }],
  [
    { groupId: 7, channelKey: 'tvg-2' },
    { groupId: 7, channelKey: 'tvg-5' },
    { groupId: 8, channelKey: 'tvg-1' },
  ],
);

describe('panelRows', () => {
  it('orders groups favorites, all channels, playlist order, then custom groups', () => {
    expect(groupNames(channels, custom)).toEqual([
      FAVORITES,
      ALL_CHANNELS,
      'News',
      'Sports',
      'Music',
      'My Picks',
    ]);
    expect(groupNames([])).toEqual([FAVORITES, ALL_CHANNELS]);
  });

  it('hides the synthetic groups per Appearance -> Groups', () => {
    const groups = groupNames(channels);
    expect(visibleGroups(groups, true, true)).toEqual(groups);
    expect(visibleGroups(groups, false, true)).toEqual([FAVORITES, 'News', 'Sports', 'Music']);
    expect(visibleGroups(groups, true, false)).toEqual([ALL_CHANNELS, 'News', 'Sports', 'Music']);
  });

  it('resolves a group to its channels: all, favorites in managed order, playlist, custom', () => {
    expect(channelsIn(channels, ALL_CHANNELS).map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(channelsIn(channels, FAVORITES).map((c) => c.id)).toEqual([4, 3]);
    expect(channelsIn(channels, 'Sports').map((c) => c.id)).toEqual([3, 4]);
    expect(channelsIn(channels, 'My Picks', custom).map((c) => c.id)).toEqual([2, 5]);
    expect(channelsIn(channels, 'Nowhere', custom)).toEqual([]);
  });

  it('a custom group named like a playlist group resolves to the playlist group', () => {
    const clash = toCustomGroups(
      [{ id: 9, name: 'News', sortIndex: 0 }],
      [{ groupId: 9, channelKey: 'tvg-5' }],
    );
    expect(channelsIn(channels, 'News', clash).map((c) => c.id)).toEqual([1, 2]);
  });

  it('collects the effective EPG ids once each', () => {
    expect(epgIdsOf(channels)).toEqual(['tvg-1', 'tvg-2', 'tvg-3', 'tvg-4']);
  });

  it('builds all-channels rows with playlist numbers and now/next data', () => {
    const guide = new Map([
      [
        'tvg-1',
        {
          now: testProgram('tvg-1', at(14, 30), at(15, 45), 'Business Hour', {
            episode: 'S1 E7',
            description: 'All-new episode.',
          }),
          next: testProgram('tvg-1', at(15, 45), at(17, 15), 'Newsroom Live'),
        },
      ],
      ['tvg-2', { now: null, next: testProgram('tvg-2', at(16, 0), at(17, 0), 'Later') }],
    ]);
    const rows = buildRows(channels, ALL_CHANNELS, guide, at(14, 45), style);
    expect(rows.map((r) => r.displayNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rows[0]).toMatchObject({
      nowTitle: 'Business Hour. S1 E7',
      nowRange: '02:30 — 03:45 PM',
      nowStartMs: at(14, 30),
      nowEndMs: at(15, 45),
      remaining: '60 min',
      description: 'All-new episode.',
      nextTitle: 'Newsroom Live',
      progressPermille: 200,
    });
    expect(rows[1]).toMatchObject({ nowTitle: null, nowRange: null, remaining: null, nextTitle: 'Later' });
    // The EPG override routes Music Box to News One's schedule; no tvg-id = no data.
    expect(rows[4]?.nowTitle).toBe('Business Hour. S1 E7');
    expect(rows[5]).toMatchObject({
      nowTitle: null,
      nextTitle: null,
      progressPermille: 0,
      description: null,
    });
  });

  it('renumbers group rows from one like capture 74', () => {
    const rows = buildRows(channelsIn(channels, 'Sports'), 'Sports', new Map(), at(14, 45), style);
    expect(rows.map((r) => [r.channel.id, r.displayNumber])).toEqual([
      [3, 1],
      [4, 2],
    ]);
  });
});
