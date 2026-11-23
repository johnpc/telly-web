import { describe, expect, it } from 'vitest';
import type { ChannelRow, PlaylistRow, ReminderRow } from '@/core/db/types';
import { channelImport } from '@/test/dbFixtures';
import { paneTitle } from './paneTitle';
import { groupsOf, toPlaylistItems } from './playlistItems';
import { toReminderItems } from './reminderItems';
import { EMPTY_FEEDS } from './settingsFeeds';

const row = (
  id: number,
  playlistId: number,
  name: string,
  group: string | null,
  number = id,
): ChannelRow => ({
  ...channelImport(name, { groupTitle: group }),
  id,
  playlistId,
  number,
  sortIndex: number,
  favorite: false,
  hidden: false,
  favoriteOrder: 0,
  blocked: false,
  customName: id === 1 ? 'Custom One' : null,
  audioDecoder: null,
  videoDecoder: null,
  epgOffsetMinutes: 0,
  externalPlayer: null,
  epgOverride: null,
});

const playlists: PlaylistRow[] = [
  {
    id: 1,
    name: 'A',
    url: 'http://a',
    epgUrl: 'http://a/e',
    lastUpdatedMs: 0,
    epgLastUpdatedMs: 0,
    epgFailedAtMs: 0,
  },
  {
    id: 2,
    name: 'B',
    url: 'http://b',
    epgUrl: null,
    lastUpdatedMs: 0,
    epgLastUpdatedMs: 0,
    epgFailedAtMs: 0,
  },
];
const channels = [
  row(3, 1, 'Three', 'Movies', 3),
  row(1, 1, 'One', 'News', 1),
  row(2, 1, 'Two', null, 2),
  row(4, 2, 'Four', 'Kids'),
];

describe('settings feed items', () => {
  it('maps playlists to items with counts and distinct groups in channel order', () => {
    expect(toPlaylistItems(playlists, channels)).toEqual([
      { url: 'http://a', name: 'A', channelCount: 3, epgUrl: 'http://a/e', groups: ['News', 'Movies'] },
      { url: 'http://b', name: 'B', channelCount: 1, epgUrl: null, groups: ['Kids'] },
    ]);
    expect(groupsOf([])).toEqual([]);
  });

  it('joins reminders with display names and a clock stamp', () => {
    const reminders: ReminderRow[] = [
      { id: 9, channelId: 1, title: 'Show', startMs: Date.UTC(2026, 0, 1, 20, 5), stopMs: 0, firedAtMs: 0 },
      { id: 10, channelId: 77, title: 'Gone', startMs: Date.UTC(2026, 0, 1, 8, 0), stopMs: 0, firedAtMs: 0 },
    ];
    expect(toReminderItems(reminders, channels, true, 'UTC')).toEqual([
      { id: 9, title: 'Show', channelName: 'Custom One', airTime: 'Thu, Jan 1, 8:05 PM' },
      { id: 10, title: 'Gone', channelName: '', airTime: 'Thu, Jan 1, 8:00 AM' },
    ]);
    expect(toReminderItems(reminders.slice(0, 1), channels, false, 'UTC')[0]?.airTime).toBe(
      'Thu, Jan 1, 20:05',
    );
  });

  it('titles every pane', () => {
    const feeds = {
      ...EMPTY_FEEDS,
      playlists: toPlaylistItems(playlists, channels),
      epgSources: [{ id: 5, playlistUrl: 'http://a', url: 'http://alt.example/epg.xml', addedAtMs: 1 }],
    };
    expect(paneTitle(null, feeds)).toBe('Settings');
    expect(paneTitle({ kind: 'Section', section: 'REMOTE_CONTROL' }, feeds)).toBe('Remote control');
    expect(paneTitle({ kind: 'PlaylistDetail', url: 'http://a' }, feeds)).toBe('A');
    expect(paneTitle({ kind: 'PlaylistDetail', url: 'http://zz' }, feeds)).toBe('http://zz');
    expect(paneTitle({ kind: 'EpgSourceDetail', sourceId: 5 }, feeds)).toBe('alt.example');
    expect(paneTitle({ kind: 'EpgSourceDetail', sourceId: 6 }, feeds)).toBe('EPG source');
    expect(paneTitle({ kind: 'PlaylistGroups', url: 'http://a' }, feeds)).toBe('Manage groups');
    expect(paneTitle({ kind: 'AppearanceLogos' }, feeds)).toBe('Logos');
  });
});
