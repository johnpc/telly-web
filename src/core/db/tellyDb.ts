import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  ChannelRow,
  CustomGroupMemberRow,
  CustomGroupRow,
  EpgSourceRow,
  MyListRow,
  PlaylistRow,
  ProgramRow,
  RecordingRow,
  ReminderRow,
  VodItemRow,
  VodPositionRow,
  WatchHistoryRow,
} from './types';

export const DB_NAME = 'telly';

/**
 * The single app database (Android: `TellyDatabase`, Room schema v13),
 * table for table. Booleans are not indexable in IndexedDB, so the
 * `hidden`/`favorite`/`blocked` filters run in the repositories; Room's
 * unique indices are `&` indices here. `ON DELETE CASCADE` (channels and
 * vod_items -> playlists) is enforced by `PlaylistRepository.remove`.
 */
export class TellyDb extends Dexie {
  playlists!: EntityTable<PlaylistRow, 'id'>;
  channels!: EntityTable<ChannelRow, 'id'>;
  programs!: EntityTable<ProgramRow, 'id'>;
  epg_sources!: EntityTable<EpgSourceRow, 'id'>;
  custom_groups!: EntityTable<CustomGroupRow, 'id'>;
  custom_group_members!: Table<CustomGroupMemberRow, [number, string]>;
  watch_history!: Table<WatchHistoryRow, string>;
  my_list!: Table<MyListRow, [string, number]>;
  recordings!: EntityTable<RecordingRow, 'id'>;
  reminders!: EntityTable<ReminderRow, 'id'>;
  vod_items!: EntityTable<VodItemRow, 'id'>;
  vod_positions!: Table<VodPositionRow, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      playlists: '++id, &url',
      channels: '++id, playlistId, [playlistId+groupTitle], number, sortIndex, streamUrl, tvgId',
      programs: '++id, &[channelTvgId+startMs], channelTvgId, startMs, endMs',
      epg_sources: '++id, &[playlistUrl+url], playlistUrl, addedAtMs',
      custom_groups: '++id, sortIndex',
      custom_group_members: '[groupId+channelKey], groupId',
      watch_history: 'channelKey, watchedAtMs',
      my_list: '[channelKey+startMs], addedAtMs',
      recordings: '++id, status, startMs, [channelKey+startMs]',
      reminders: '++id, &[channelId+startMs+title], startMs',
      vod_items: '++id, playlistId, itemKey, sortIndex, streamUrl',
      vod_positions: 'itemKey',
    });
  }
}

/** The production database; repositories default to it, tests construct their own. */
export const tellyDb = new TellyDb();
