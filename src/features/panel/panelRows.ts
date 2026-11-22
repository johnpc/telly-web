import type { NowNext } from '@/core/db/programRepository';
import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import type { ClockStyle } from '@/features/playback/info/clockStyle';
import { ProgramTimes } from '@/features/playback/info/programTimes';
import { ALL_CHANNELS } from './panelGroups';

/**
 * One channel row of the panel, pre-formatted for rendering (port of
 * Android `PanelRow.kt`). Channel numbers restart from 1 inside a group
 * (capture 74); "All channels" keeps the playlist numbering.
 */
export interface PanelRow {
  channel: ChannelRow;
  displayNumber: number;
  nowTitle: string | null;
  nowRange: string | null;
  nowStartMs: number | null;
  nowEndMs: number | null;
  remaining: string | null;
  description: string | null;
  nextTitle: string | null;
  progressPermille: number;
}

/** The effective EPG ids of `channels`, deduplicated, for the now/next query. */
export function epgIdsOf(channels: readonly ChannelRow[]): string[] {
  return [...new Set(channels.map(epgId).filter((id): id is string => id !== null))];
}

type NowFields = Omit<PanelRow, 'channel' | 'displayNumber' | 'nextTitle'>;

const NO_PROGRAMME: NowFields = {
  nowTitle: null,
  nowRange: null,
  nowStartMs: null,
  nowEndMs: null,
  remaining: null,
  description: null,
  progressPermille: 0,
};

function nowFields(now: ProgramRow | null, atMs: number, style: ClockStyle): NowFields {
  if (now === null) return NO_PROGRAMME;
  return {
    nowTitle: programTitle(now),
    nowRange: ProgramTimes.range(now.startMs, now.endMs, style),
    nowStartMs: now.startMs,
    nowEndMs: now.endMs,
    remaining: `${ProgramTimes.remainingMinutes(now.endMs, atMs)} min`,
    description: now.description,
    progressPermille: ProgramTimes.progressPermille(now.startMs, now.endMs, atMs),
  };
}

export function buildRows(
  groupChannels: readonly ChannelRow[],
  group: string,
  guide: ReadonlyMap<string, NowNext>,
  atMs: number,
  style: ClockStyle,
): PanelRow[] {
  return groupChannels.map((channel, index) => {
    const id = epgId(channel);
    const nowNext = (id === null ? undefined : guide.get(id)) ?? { now: null, next: null };
    return {
      channel,
      displayNumber: group === ALL_CHANNELS ? channel.number : index + 1,
      nextTitle: nowNext.next === null ? null : programTitle(nowNext.next),
      ...nowFields(nowNext.now, atMs, style),
    };
  });
}
