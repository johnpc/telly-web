import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import type { ChannelRow, ProgramRow, WatchHistoryRow } from '@/core/db/types';
import { type WatchHistoryRepository, watchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { useProgramsInRange } from '@/features/epg/useProgramsInRange';
import type { ClockStyle } from '@/features/playback/info/clockStyle';
import { epgIdsOf } from '@/features/playback/info/epgLookup';
import { historyRows, programmeSpan, type HistoryRow } from './historyRows';

export interface HistoryDeps {
  history: WatchHistoryRepository;
  channels: ChannelRepository;
}

export const defaultHistoryDeps: HistoryDeps = {
  history: watchHistoryRepository,
  channels: channelRepository,
};

interface HistorySources {
  events: WatchHistoryRow[] | undefined;
  channels: ChannelRow[] | undefined;
}

function useHistorySources(deps: HistoryDeps): HistorySources {
  const events = useLiveQuery(() => deps.history.events(), [deps]);
  const channels = useLiveQuery(() => deps.channels.visible(), [deps]);
  return { events, channels };
}

/** Rows once every source has read; undefined before. */
export function resolveRows(
  sources: HistorySources,
  programs: ProgramRow[] | undefined,
  style: ClockStyle,
): HistoryRow[] | undefined {
  const { events, channels } = sources;
  if (events === undefined || channels === undefined || programs === undefined) return undefined;
  return historyRows(events, channels, programs, style);
}

/**
 * The History screen's rows: the full capped watch history newest-first,
 * each resolving the programme that aired at the watch time; undefined
 * until the first read (Android `HistoryViewModel.rows`).
 */
export function useHistoryRows(
  style: ClockStyle,
  deps: HistoryDeps = defaultHistoryDeps,
): HistoryRow[] | undefined {
  const sources = useHistorySources(deps);
  const span = programmeSpan(sources.events ?? []);
  const programs = useProgramsInRange(epgIdsOf(sources.channels), span.fromMs, span.toMs);
  return useMemo(() => resolveRows(sources, programs, style), [sources, programs, style]);
}
