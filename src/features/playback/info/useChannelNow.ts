import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { useNowNext } from '@/features/epg/useNowNext';
import { epgIdsOf, nowOf } from './epgLookup';

/** The programme airing on `channel` at `instant`, live from the EPG (sheet header, description). */
export function useChannelNow(channel: ChannelRow | null, instant: number): ProgramRow | null {
  const guide = useNowNext(epgIdsOf(channel === null ? [] : [channel]), instant);
  return nowOf(guide, channel);
}
