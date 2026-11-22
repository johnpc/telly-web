import { keyOf } from '@/core/db/channelIdentity';
import { displayName, epgId, type ChannelRow, type ProgramRow, type WatchHistoryRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import type { ClockStyle } from '@/features/playback/info/clockStyle';
import { ProgramTimes } from '@/features/playback/info/programTimes';

/** One History-screen row: the channel + what/when it was last watched. */
export interface HistoryRow {
  channel: ChannelRow;
  name: string;
  watchedAtMs: number;
  /** "Sun, Sep 13, 2:45 PM" — the shared TiviMate clock format. */
  watchedText: string;
  /** The programme airing when the channel was last watched, if the EPG knows. */
  programmeTitle: string | null;
}

function channelsOf(events: readonly WatchHistoryRow[], channels: readonly ChannelRow[]): ChannelRow[] {
  const byKey = new Map(channels.map((channel) => [keyOf(channel), channel]));
  return events.flatMap((event) => {
    const channel = byKey.get(event.channelKey);
    return channel === undefined ? [] : [channel];
  });
}

/** The recent-cards row: newest-first, minus the channel already playing (Android `HistoryRows`). */
export function recentChannels(
  events: readonly WatchHistoryRow[],
  channels: readonly ChannelRow[],
  currentChannelId: number | null,
): ChannelRow[] {
  return channelsOf(events, channels).filter((channel) => channel.id !== currentChannelId);
}

function titleAiringOn(channel: ChannelRow, atMs: number, programs: readonly ProgramRow[]): string | null {
  const id = epgId(channel);
  const airing = programs.find((p) => p.channelTvgId === id && p.startMs <= atMs && atMs < p.endMs);
  return airing === undefined ? null : programTitle(airing);
}

/** The History screen's rows: the full capped list, newest first. */
export function historyRows(
  events: readonly WatchHistoryRow[],
  channels: readonly ChannelRow[],
  programs: readonly ProgramRow[],
  style: ClockStyle,
): HistoryRow[] {
  const byKey = new Map(channels.map((channel) => [keyOf(channel), channel]));
  return events.flatMap((event) => {
    const channel = byKey.get(event.channelKey);
    if (channel === undefined) return [];
    return [
      {
        channel,
        name: displayName(channel),
        watchedAtMs: event.watchedAtMs,
        watchedText: ProgramTimes.clock(event.watchedAtMs, style),
        programmeTitle: titleAiringOn(channel, event.watchedAtMs, programs),
      },
    ];
  });
}

/** The [from, to) span the History screen must observe to resolve `historyRows`' programmes. */
export function programmeSpan(events: readonly WatchHistoryRow[]): { fromMs: number; toMs: number } {
  const stamps = events.map((event) => event.watchedAtMs);
  if (stamps.length === 0) return { fromMs: 0, toMs: 1 };
  return { fromMs: Math.min(...stamps), toMs: Math.max(...stamps) + 1 };
}
