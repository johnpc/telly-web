/**
 * Row types of the library-side tables (EPG sources, custom groups, watch
 * history, My list, recordings, reminders, VOD). Same names and columns as
 * the Android Room entities; re-exported through `types.ts`.
 */
export interface EpgSourceRow {
  id: number;
  playlistUrl: string;
  url: string;
  addedAtMs: number;
}

export interface CustomGroupRow {
  id: number;
  name: string;
  sortIndex: number;
}

/** Membership keyed by the refresh-stable channel identity, never by row id. */
export interface CustomGroupMemberRow {
  groupId: number;
  channelKey: string;
}

export interface WatchHistoryRow {
  channelKey: string;
  watchedAtMs: number;
}

export interface MyListRow {
  channelKey: string;
  startMs: number;
  endMs: number;
  title: string;
  description: string | null;
  addedAtMs: number;
}

export interface RecordingRow {
  id: number;
  channelKey: string;
  channelName: string;
  streamUrl: string;
  title: string;
  filePath: string;
  startMs: number;
  plannedEndMs: number;
  endMs: number | null;
  /** A `RecordingStatus` name: SCHEDULED · RECORDING · STOPPING · DONE · FAILED. */
  status: string;
  sizeBytes: number;
}

export interface ReminderRow {
  id: number;
  channelId: number;
  title: string;
  startMs: number;
  stopMs: number;
  /** v13: the clock when the popup was claimed (0 = not yet). */
  firedAtMs: number;
}

export interface VodItemRow {
  id: number;
  playlistId: number;
  sortIndex: number;
  /** Refresh-stable identity resume positions are keyed by. */
  itemKey: string;
  name: string;
  groupTitle: string | null;
  logoUrl: string | null;
  streamUrl: string;
}

export interface VodPositionRow {
  itemKey: string;
  positionMs: number;
  durationMs: number;
  updatedAtMs: number;
}
