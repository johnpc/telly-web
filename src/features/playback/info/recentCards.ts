import type { NowNext } from '@/core/db/programRepository';
import { displayName, epgId, type ChannelRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import type { ClockStyle } from './clockStyle';
import { ProgramTimes } from './programTimes';

/**
 * One recent-channel card of the info overlay's shortcut row: the channel
 * logo over its CURRENT programme title in accent blue — not the channel
 * name/number; focusing it adds an air-time + title line (Android `RecentCard`).
 */
export interface RecentCard {
  channel: ChannelRow;
  name: string;
  nowTitle: string | null;
  nowRange: string | null;
}

export function buildRecentCards(
  recent: readonly ChannelRow[],
  guide: ReadonlyMap<string, NowNext> | undefined,
  style: ClockStyle,
): RecentCard[] {
  return recent.map((channel) => {
    const id = epgId(channel);
    const now = (id === null ? undefined : guide?.get(id))?.now ?? null;
    return {
      channel,
      name: displayName(channel),
      nowTitle: now === null ? null : programTitle(now),
      nowRange: now === null ? null : ProgramTimes.range(now.startMs, now.endMs, style),
    };
  });
}

/** The focused card's bottom line: `air window + programme title`. */
export function recentCardLine(card: RecentCard | null): string | null {
  if (card === null || card.nowTitle === null) return null;
  return card.nowRange === null ? card.nowTitle : `${card.nowRange}   ${card.nowTitle}`;
}
