import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { type WatchHistoryRepository, watchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { useNowNext } from '@/features/epg/useNowNext';
import { recentChannels } from '@/features/history/historyRows';
import type { ClockStyle } from './clockStyle';
import { epgIdsOf } from './epgLookup';
import { buildRecentCards, type RecentCard } from './recentCards';

/**
 * The recent-channel cards: recently watched channels newest-first
 * excluding the one already playing, each paired with its CURRENT programme
 * (Android `RecentRowFeed`).
 */
export function useRecentCards(
  channels: readonly ChannelRow[],
  currentId: number | null,
  instant: number,
  style: ClockStyle,
  history: WatchHistoryRepository = watchHistoryRepository,
): RecentCard[] {
  const events = useLiveQuery(() => history.events(), [history]);
  const recent = useMemo(
    () => recentChannels(events ?? [], channels, currentId),
    [events, channels, currentId],
  );
  const guide = useNowNext(
    useMemo(() => epgIdsOf(recent), [recent]),
    instant,
  );
  return useMemo(() => buildRecentCards(recent, guide, style), [recent, guide, style]);
}
