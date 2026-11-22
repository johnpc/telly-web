import type { NowNext } from '@/core/db/programRepository';
import { displayName, type ChannelRow, type ProgramRow } from '@/core/db/types';
import { badges, type StreamDetails } from '@/core/player';
import { programTitle } from '@/features/epg/nowNext';
import type { ClockStyle } from './clockStyle';
import { ProgramTimes } from './programTimes';

/** Everything the bottom info overlay renders, pre-formatted (capture 34). */
export interface PlaybackInfoData {
  channelId: number;
  number: number;
  name: string;
  logoUrl: string | null;
  group: string | null;
  clockText: string;
  title: string | null;
  timeRange: string | null;
  remaining: string | null;
  progressPermille: number;
  description: string | null;
  nextLine: string | null;
  badges: string[];
  elapsed: string | null;
  duration: string | null;
}

export const NO_NOW_NEXT: NowNext = { now: null, next: null };

function nextLineOf(next: ProgramRow | null, style: ClockStyle): string | null {
  if (next === null) return null;
  return `${ProgramTimes.range(next.startMs, next.endMs, style)}  ${programTitle(next)}`;
}

export function buildPlaybackInfo(
  channel: ChannelRow,
  nowNext: NowNext,
  details: StreamDetails | null,
  atMs: number,
  style: ClockStyle,
): PlaybackInfoData {
  const now = nowNext.now;
  return {
    channelId: channel.id,
    number: channel.number,
    name: displayName(channel),
    logoUrl: channel.logoUrl,
    group: channel.groupTitle,
    clockText: ProgramTimes.clock(atMs, style),
    title: now === null ? null : programTitle(now),
    timeRange: now === null ? null : ProgramTimes.range(now.startMs, now.endMs, style),
    remaining: now === null ? null : `${ProgramTimes.remainingMinutes(now.endMs, atMs)} min`,
    progressPermille: now === null ? 0 : ProgramTimes.progressPermille(now.startMs, now.endMs, atMs),
    description: now?.description ?? null,
    nextLine: nextLineOf(nowNext.next, style),
    badges: badges(details),
    elapsed: now === null ? null : ProgramTimes.span(atMs - now.startMs),
    duration: now === null ? null : ProgramTimes.span(now.endMs - now.startMs),
  };
}

/** `"1  News One"` — the number + name label every overlay variant shows. */
export function channelLabel(info: Pick<PlaybackInfoData, 'number' | 'name'>): string {
  return `${info.number}  ${info.name}`;
}
