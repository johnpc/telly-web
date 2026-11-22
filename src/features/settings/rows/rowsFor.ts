import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { RowIds } from '../rowIds';
import type { SettingsFeeds } from '../settingsFeeds';
import { type SettingsRow, value } from '../settingsRow';
import { SETTINGS_SECTIONS, type SettingsSectionId } from '../settingsSection';
import type { SettingsPane } from '../settingsUiState';
import {
  appearanceGroupsRows,
  appearanceLogosRows,
  appearancePlayerRows,
  appearanceRows,
  appearanceTvGuideRows,
} from './appearanceRows';
import { epgRows, epgSourceDetailRows, epgSourcesRows } from './epgRows';
import { generalRows } from './generalRows';
import { blockedChannelRows, parentalRows } from './parentalRows';
import { aboutRows, otherRows, otherSearchRows, recordingRows, remindersRows, vodRows } from './otherRows';
import { playbackRows, remoteControlRows, remotePlayerRows, remoteTvGuideRows } from './playbackRows';
import { playlistDetailRows, playlistGroupRows, playlistsRows } from './playlistRows';

/** The root sheet: the nine captured sections (uidump 18). */
function rootRows(): SettingsRow[] {
  return SETTINGS_SECTIONS.map((section) => value(RowIds.SECTION_PREFIX + section.id, section.title));
}

function sectionRows(
  section: SettingsSectionId,
  s: SettingsRepository,
  feeds: SettingsFeeds,
  versionName: string,
): SettingsRow[] {
  switch (section) {
    case 'GENERAL':
      return generalRows(s, feeds.autoBackup);
    case 'PLAYLISTS':
      return playlistsRows(s, feeds.playlists);
    case 'EPG':
      return epgRows(s);
    case 'APPEARANCE':
      return appearanceRows(s);
    case 'PLAYBACK':
      return playbackRows(s);
    case 'REMOTE_CONTROL':
      return remoteControlRows(s);
    case 'PARENTAL_CONTROLS':
      return parentalRows(s);
    case 'OTHER':
      return otherRows();
    case 'ABOUT':
      return aboutRows(s, versionName);
  }
}

function playlistDetail(url: string, s: SettingsRepository, feeds: SettingsFeeds): SettingsRow[] {
  const item = feeds.playlists.find((p) => p.url === url);
  if (item === undefined) return [];
  return playlistDetailRows(s, item, feeds.epgSources.filter((source) => source.playlistUrl === url).length);
}

function playlistGroups(url: string, s: SettingsRepository, feeds: SettingsFeeds): SettingsRow[] {
  const item = feeds.playlists.find((p) => p.url === url);
  return item === undefined ? [] : playlistGroupRows(s, item);
}

type LeafBuilder = (s: SettingsRepository, feeds: SettingsFeeds) => SettingsRow[];

/** The leaf sub-panes: fixed row builders over the settings map + feeds. */
const LEAF_BUILDERS: Readonly<Record<string, LeafBuilder>> = {
  EpgSources: (_s, feeds) => epgSourcesRows(feeds.playlists, feeds.epgSources),
  Reminders: (s, feeds) => remindersRows(s, feeds.reminders),
  Vod: (s) => vodRows(s),
  Recording: (_s, feeds) => recordingRows(feeds.recording),
  OtherSearch: (s) => otherSearchRows(s),
  BlockedChannels: (_s, feeds) => blockedChannelRows(feeds.blockedChannels),
  AppearanceTvGuide: (s) => appearanceTvGuideRows(s),
  AppearancePlayer: (s) => appearancePlayerRows(s),
  AppearanceGroups: (s) => appearanceGroupsRows(s),
  AppearanceLogos: (s) => appearanceLogosRows(s),
  RemoteTvGuide: (s) => remoteTvGuideRows(s),
  RemotePlayer: (s) => remotePlayerRows(s),
};

function epgSourceDetail(sourceId: number, feeds: SettingsFeeds): SettingsRow[] {
  const source = feeds.epgSources.find((row) => row.id === sourceId);
  return source === undefined ? [] : epgSourceDetailRows(source);
}

/** Routes a sheet to its row builder — the whole captured settings tree (Android `rowsFor`). */
export function rowsFor(
  pane: SettingsPane | null,
  s: SettingsRepository,
  feeds: SettingsFeeds,
  versionName: string,
): SettingsRow[] {
  if (pane === null) return rootRows();
  if (pane.kind === 'Section') return sectionRows(pane.section, s, feeds, versionName);
  if (pane.kind === 'PlaylistDetail') return playlistDetail(pane.url, s, feeds);
  if (pane.kind === 'PlaylistGroups') return playlistGroups(pane.url, s, feeds);
  if (pane.kind === 'EpgSourceDetail') return epgSourceDetail(pane.sourceId, feeds);
  return LEAF_BUILDERS[pane.kind]?.(s, feeds) ?? [];
}
