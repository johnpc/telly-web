// Pure assembly for the My List screen (port of Android `MyListRows`): entries
// come most-recently-added first from the store, keys resolve to channels via
// the refresh-stable identity (keys without a visible channel drop, the
// History precedent), and entries whose stop time has passed auto-hide.
import { keyOf } from '@/core/db/channelIdentity';
import type { ChannelRow, MyListRow } from '@/core/db/types';
import { clockText } from '@/features/search/programTimes';

/** One My List row: the saved programme plus its resolved channel. */
export interface MyListScreenRow {
  entry: MyListRow;
  channel: ChannelRow;
  /** "Sun, Sep 13, 2:45 PM" air-time stamp. */
  airTimeText: string;
  /** Airing now: OK tunes; a future entry shows its description instead. */
  airing: boolean;
}

export const MY_LIST_TITLE = 'My list';
export const MY_LIST_EMPTY = 'No programs';
export const MY_LIST_REMOVE_HINT = 'Press and hold OK to remove';
export const NO_INFORMATION = 'No information';

/** First visible channel wins a shared identity. */
function channelsByKey(channels: readonly ChannelRow[]): Map<string, ChannelRow> {
  const byKey = new Map<string, ChannelRow>();
  for (const channel of channels) if (!byKey.has(keyOf(channel))) byKey.set(keyOf(channel), channel);
  return byKey;
}

function rowOf(entry: MyListRow, channel: ChannelRow, nowMs: number): MyListScreenRow {
  return { entry, channel, airTimeText: clockText(entry.startMs), airing: entry.startMs <= nowMs };
}

export function myListRows(
  entries: readonly MyListRow[],
  channels: readonly ChannelRow[],
  nowMs: number,
): MyListScreenRow[] {
  const byKey = channelsByKey(channels);
  const out: MyListScreenRow[] = [];
  for (const entry of entries.filter((row) => row.endMs > nowMs)) {
    const channel = byKey.get(entry.channelKey);
    if (channel !== undefined) out.push(rowOf(entry, channel, nowMs));
  }
  return out;
}

export const myListRowId = (row: MyListScreenRow): string =>
  `mylist-${row.entry.channelKey}-${row.entry.startMs}`;
