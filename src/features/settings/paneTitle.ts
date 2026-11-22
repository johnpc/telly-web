import { epgSourceName } from '@/core/db/epgSourceRepository';
import type { SettingsFeeds } from './settingsFeeds';
import { sectionTitle } from './settingsSection';
import type { SettingsPane } from './settingsUiState';

const FIXED_TITLES: Readonly<Record<string, string>> = {
  PlaylistGroups: 'Manage groups',
  EpgSources: 'EPG sources',
  RemoteTvGuide: 'TV guide',
  RemotePlayer: 'Player',
  Reminders: 'Reminders',
  Vod: 'VOD',
  Recording: 'Recording',
  OtherSearch: 'Search',
  BlockedChannels: 'Blocked channels',
  AppearanceTvGuide: 'TV guide',
  AppearancePlayer: 'Player',
  AppearanceGroups: 'Groups',
  AppearanceLogos: 'Logos',
};

/** The sheet's header title for `pane` (root sheet = "Settings"; Android `paneTitle`). */
export function paneTitle(pane: SettingsPane | null, feeds: SettingsFeeds): string {
  if (pane === null) return 'Settings';
  switch (pane.kind) {
    case 'Section':
      return sectionTitle(pane.section);
    case 'PlaylistDetail':
      return feeds.playlists.find((p) => p.url === pane.url)?.name ?? pane.url;
    case 'EpgSourceDetail': {
      const source = feeds.epgSources.find((row) => row.id === pane.sourceId);
      return source === undefined ? 'EPG source' : epgSourceName(source.url);
    }
    default:
      return FIXED_TITLES[pane.kind] ?? pane.kind;
  }
}
