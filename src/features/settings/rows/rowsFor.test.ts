import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channelImport } from '@/test/dbFixtures';
import type { ChannelRow } from '@/core/db/types';
import { RowIds } from '../rowIds';
import { EMPTY_FEEDS, type SettingsFeeds } from '../settingsFeeds';
import type { SettingsPane } from '../settingsUiState';
import { userAgentSummary } from './generalRows';
import { sizeText } from './otherRows';
import { epgSourceCountSummary } from './playlistRows';
import { rowsFor } from './rowsFor';

const titles = (
  pane: SettingsPane | null,
  feeds: SettingsFeeds = EMPTY_FEEDS,
  s = new SettingsRepository(new MemoryKeyValueStore()),
) =>
  rowsFor(pane, s, feeds, '9.9').map((row) =>
    row.kind === 'Header' || row.kind === 'Note' ? `#${row.text}` : row.title,
  );

const channel = (id: number, name: string, group: string, blocked = false): ChannelRow => ({
  ...channelImport(name, { groupTitle: group }),
  id,
  playlistId: 1,
  number: id,
  sortIndex: id,
  favorite: false,
  hidden: false,
  favoriteOrder: 0,
  blocked,
  customName: null,
  audioDecoder: null,
  videoDecoder: null,
  epgOffsetMinutes: 0,
  externalPlayer: null,
  epgOverride: null,
});

const feeds: SettingsFeeds = {
  ...EMPTY_FEEDS,
  playlists: [
    {
      url: 'http://b/list.m3u',
      name: 'Beta',
      channelCount: 2,
      epgUrl: 'http://b/epg.xml',
      groups: ['News', 'Movies'],
    },
    { url: 'http://a/list.m3u', name: 'alpha', channelCount: 31, epgUrl: null, groups: [] },
  ],
  epgSources: [{ id: 4, playlistUrl: 'http://b/list.m3u', url: 'http://alt/epg.xml', addedAtMs: 1 }],
  reminders: [{ id: 2, title: 'Match', channelName: 'Sports', airTime: '08:00 PM' }],
  blockedChannels: [channel(5, 'Spicy', 'Adult', true)],
  recording: { usedBytes: 1536, freeBytes: 2 * 1024 ** 3 },
};

describe('rowsFor', () => {
  it('renders the nine sections at the root, in order', () => {
    expect(titles(null)).toEqual([
      'General',
      'Playlists',
      'EPG',
      'Appearance',
      'Playback',
      'Remote control',
      'Parental controls',
      'Other',
      'About',
    ]);
  });

  it('renders every section pane with the captured copy', () => {
    expect(titles({ kind: 'Section', section: 'GENERAL' })).toContain('Confirm exit by second press Back');
    expect(titles({ kind: 'Section', section: 'GENERAL' })).toContain('CORS proxy');
    expect(titles({ kind: 'Section', section: 'PLAYLISTS' }, feeds)).toEqual([
      'alpha',
      'Beta',
      'Playlists sorting',
      'Add playlist',
      'Update all playlists',
    ]);
    const byDate = new SettingsRepository(new MemoryKeyValueStore({ playlists_sorting: 'By date added' }));
    expect(titles({ kind: 'Section', section: 'PLAYLISTS' }, feeds, byDate).slice(0, 2)).toEqual([
      'Beta',
      'alpha',
    ]);
    expect(titles({ kind: 'Section', section: 'EPG' })).toContain('Update EPG');
    expect(titles({ kind: 'Section', section: 'APPEARANCE' })).toContain('Color theme');
    expect(titles({ kind: 'Section', section: 'PLAYBACK' })).toContain('Skip steps');
    expect(titles({ kind: 'Section', section: 'REMOTE_CONTROL' })).toContain('#Seeking options');
    expect(titles({ kind: 'Section', section: 'PARENTAL_CONTROLS' })[0]).toBe('Off');
    const on = new SettingsRepository(new MemoryKeyValueStore({ parental_enabled: 'true' }));
    expect(titles({ kind: 'Section', section: 'PARENTAL_CONTROLS' }, EMPTY_FEEDS, on)[0]).toBe('On');
    expect(titles({ kind: 'Section', section: 'OTHER' })).toEqual([
      'Search',
      'Reminders',
      'Recording',
      'VOD',
    ]);
    const about = rowsFor({ kind: 'Section', section: 'ABOUT' }, on, EMPTY_FEEDS, '9.9');
    expect(about[2]).toMatchObject({ title: 'Version', summary: '9.9' });
  });

  it('locks the autostart rows on the web and keeps the User-Agent honest', () => {
    const general = rowsFor(
      { kind: 'Section', section: 'GENERAL' },
      new SettingsRepository(new MemoryKeyValueStore()),
      EMPTY_FEEDS,
      '1',
    );
    expect(general[0]).toMatchObject({ id: RowIds.AUTOSTART_BOOT, locked: true });
    expect(userAgentSummary('')).toBe('Not set');
    expect(userAgentSummary('ua')).toContain('ua');
  });

  it('renders the playlist detail, groups, EPG sources and source detail panes', () => {
    const detail = rowsFor(
      { kind: 'PlaylistDetail', url: 'http://b/list.m3u' },
      new SettingsRepository(new MemoryKeyValueStore()),
      feeds,
      '1',
    );
    expect(detail.find((row) => row.id === RowIds.PLAYLIST_EPG_SOURCES)).toMatchObject({
      summary: '2 sources',
    });
    expect(detail.find((row) => row.id === RowIds.PLAYLIST_UPDATE_INTERVAL)).toMatchObject({
      summary: 'None',
    });
    expect(titles({ kind: 'PlaylistDetail', url: 'http://nope' }, feeds)).toEqual([]);
    expect(titles({ kind: 'PlaylistGroups', url: 'http://b/list.m3u' }, feeds)).toEqual(['News', 'Movies']);
    expect(titles({ kind: 'PlaylistGroups', url: 'http://nope' }, feeds)).toEqual([]);
    expect(titles({ kind: 'EpgSources' }, feeds)).toEqual([
      'Beta (default)',
      'alt',
      'Add source',
      '#EPG sources should be assigned in the playlist settings',
    ]);
    expect(titles({ kind: 'EpgSourceDetail', sourceId: 4 }, feeds)).toEqual(['Source URL', 'Delete source']);
    expect(titles({ kind: 'EpgSourceDetail', sourceId: 99 }, feeds)).toEqual([]);
    expect(epgSourceCountSummary(0)).toBe('No sources');
    expect(epgSourceCountSummary(1)).toBe('1 source');
  });

  it('renders the leaf panes', () => {
    expect(titles({ kind: 'Reminders' }, feeds)).toEqual([
      'Show reminder before, min',
      '#Scheduled reminders',
      'Match',
    ]);
    expect(titles({ kind: 'Reminders' })).toEqual(['Show reminder before, min', '#No reminders']);
    expect(titles({ kind: 'Vod' })).toEqual(['Remember playback position', 'Clear playback positions']);
    expect(titles({ kind: 'Recording' }, feeds)).toEqual([
      'Storage used by recordings',
      'Free space',
      'Delete all recordings',
      '#Scheduled recordings start only while telly is running',
    ]);
    expect(titles({ kind: 'OtherSearch' })).toEqual(['Save search history', 'Clear search history']);
    expect(titles({ kind: 'BlockedChannels' }, feeds)).toEqual(['Spicy']);
    expect(titles({ kind: 'BlockedChannels' })).toEqual(['#No blocked channels']);
    expect(titles({ kind: 'AppearanceTvGuide' })).toEqual([
      'Number of visible channels',
      'Panel transparency',
      'Show channel numbers',
    ]);
    expect(titles({ kind: 'AppearancePlayer' })).toEqual([
      'Panels transparency',
      'Panels timeout, sec',
      'Show clock',
    ]);
    expect(titles({ kind: 'AppearanceGroups' })).toEqual([
      "Show 'All channels' group",
      "Show 'Favorites' group",
    ]);
    expect(titles({ kind: 'AppearanceLogos' })).toEqual(['Logo background', 'Rounded corners']);
    expect(titles({ kind: 'RemoteTvGuide' })).toEqual([
      'Left/Right buttons',
      'Channel up/down buttons',
      'Long press OK',
    ]);
    expect(titles({ kind: 'RemotePlayer' })).toEqual([
      'OK button',
      'Up/Down buttons',
      'Left/Right buttons',
      'Long press OK',
    ]);
    const s = new SettingsRepository(new MemoryKeyValueStore());
    s.set(TellySettings.REMOTE_PLAYER_OK, 'Open channels list');
    expect(rowsFor({ kind: 'RemotePlayer' }, s, EMPTY_FEEDS, '1')[0]).toMatchObject({
      summary: 'Open channels list',
    });
  });

  it('formats byte counts', () => {
    expect(sizeText(0)).toBe('0 B');
    expect(sizeText(1536)).toBe('1.5 KB');
    expect(sizeText(2 * 1024 ** 3)).toBe('2.0 GB');
    expect(sizeText(-5)).toBe('0 B');
    expect(sizeText(1024 ** 6)).toBe('1048576.0 TB');
  });
});
