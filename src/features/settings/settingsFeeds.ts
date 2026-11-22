import type { ChannelRow, EpgSourceRow } from '@/core/db/types';
import type { AutoBackupStatus } from './backup/autoBackupState';

/** What the Playlists pane needs to know about one stored playlist. */
export interface PlaylistItem {
  url: string;
  name: string;
  channelCount: number;
  epgUrl: string | null;
  /** Distinct group titles in playlist order (Manage groups pane). */
  groups: readonly string[];
}

/** One scheduled reminder as the settings pane lists it. */
export interface ReminderListItem {
  id: number;
  title: string;
  channelName: string;
  airTime: string;
}

/** Other -> Recording: bytes used by captures and the volume's free bytes. */
export interface RecordingStorageInfo {
  usedBytes: number;
  freeBytes: number;
}

/** The live data feeds the deeper settings panes join (parameter object). */
export interface SettingsFeeds {
  playlists: readonly PlaylistItem[];
  epgSources: readonly EpgSourceRow[];
  reminders: readonly ReminderListItem[];
  /** Parental -> Blocked channels; one row per blocked channel. */
  blockedChannels: readonly ChannelRow[];
  /** General -> Automatic backup; the row's live summary line. */
  autoBackup: AutoBackupStatus;
  recording: RecordingStorageInfo;
}

export const EMPTY_FEEDS: SettingsFeeds = {
  playlists: [],
  epgSources: [],
  reminders: [],
  blockedChannels: [],
  autoBackup: { lastExportMs: null },
  recording: { usedBytes: 0, freeBytes: 0 },
};
