import { keyOf } from './channelIdentity';
import type { TellyDb } from './tellyDb';
import type { ChannelCatchup, ChannelFlags, ChannelOverrides, ChannelRow, ChannelSource } from './types';

/** One parsed live channel as the importer hands it to the database. */
export type ChannelImport = ChannelSource & ChannelCatchup;

export const DEFAULT_FLAGS: ChannelFlags = {
  favorite: false,
  hidden: false,
  favoriteOrder: 0,
  blocked: false,
};

export const DEFAULT_OVERRIDES: ChannelOverrides = {
  customName: null,
  audioDecoder: null,
  videoDecoder: null,
  epgOffsetMinutes: 0,
  externalPlayer: null,
  epgOverride: null,
};

function flagsOf(row: ChannelRow): ChannelFlags {
  return {
    favorite: row.favorite,
    hidden: row.hidden,
    favoriteOrder: row.favoriteOrder,
    blocked: row.blocked,
  };
}

function overridesOf(row: ChannelRow): ChannelOverrides {
  return {
    customName: row.customName,
    audioDecoder: row.audioDecoder,
    videoDecoder: row.videoDecoder,
    epgOffsetMinutes: row.epgOffsetMinutes,
    externalPlayer: row.externalPlayer,
    epgOverride: row.epgOverride,
  };
}

/**
 * Builds the replacement rows for `playlistId` from a fresh parse (port of
 * Android `ChannelImporter.import`): numbers are sequential from playlist
 * order, flags and overrides are carried over from `previous` by identity.
 */
export function buildChannelRows(
  playlistId: number,
  incoming: readonly ChannelImport[],
  previous: readonly ChannelRow[],
): Omit<ChannelRow, 'id'>[] {
  const carried = new Map(previous.map((row) => [keyOf(row), row]));
  return incoming.map((channel, index) => {
    const old = carried.get(keyOf(channel));
    return {
      ...channel,
      playlistId,
      number: index + 1,
      sortIndex: index,
      ...(old === undefined ? DEFAULT_FLAGS : flagsOf(old)),
      ...(old === undefined ? DEFAULT_OVERRIDES : overridesOf(old)),
    };
  });
}

/**
 * Atomically swaps a playlist's channel rows (Android: `deleteForPlaylist`
 * + `insertAll` inside `withTransaction`), preserving user state by
 * identity. Returns the number of rows written.
 */
export function replaceChannelsForPlaylist(
  db: TellyDb,
  playlistId: number,
  incoming: readonly ChannelImport[],
): Promise<number> {
  return db.transaction('rw', db.channels, async () => {
    const previous = await db.channels.where('playlistId').equals(playlistId).toArray();
    const rows = buildChannelRows(playlistId, incoming, previous);
    await db.channels.where('playlistId').equals(playlistId).delete();
    await db.channels.bulkAdd(rows);
    return rows.length;
  });
}
