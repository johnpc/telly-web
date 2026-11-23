import { type ProgramRepository, programRepository } from '@/core/db/programRepository';
import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import { shifted } from '@/features/epg/epgOffsets';

const MINUTE_MS = 60_000;

/** The EPG reads catch-up needs, with the channel's "EPG time offset" applied like every other lookup. */
export interface CatchupEpg {
  /** Programmes overlapping [fromMs, toMs) on the channel, shifted into display time. */
  programmesFor(channel: ChannelRow, fromMs: number, toMs: number): Promise<ProgramRow[]>;
  /** The programme airing on the channel at `atMs`, or null. */
  airingAt(channel: ChannelRow, atMs: number): Promise<ProgramRow | null>;
}

interface Offsets {
  id: string;
  ms: number;
  map: Map<string, number>;
}

/** The channel's EPG id and offset; null for a channel without EPG. */
function offsetsOf(channel: ChannelRow): Offsets | null {
  const id = epgId(channel);
  if (id === null) return null;
  const ms = channel.epgOffsetMinutes * MINUTE_MS;
  return { id, ms, map: new Map([[id, ms]]) };
}

async function windowFor(
  programs: ProgramRepository,
  channel: ChannelRow,
  fromMs: number,
  toMs: number,
): Promise<ProgramRow[]> {
  const offsets = offsetsOf(channel);
  if (offsets === null) return [];
  const rows = await programs.window([offsets.id], fromMs - offsets.ms, toMs - offsets.ms);
  return shifted(rows, offsets.map);
}

async function airingFor(
  programs: ProgramRepository,
  channel: ChannelRow,
  atMs: number,
): Promise<ProgramRow | null> {
  const offsets = offsetsOf(channel);
  if (offsets === null) return null;
  const { now } = await programs.nowAndNext(offsets.id, atMs - offsets.ms);
  return now === null ? null : (shifted([now], offsets.map)[0] ?? null);
}

/** Android `EpgRepository.programsFor` / `nowNext` for one channel over the Dexie programme table. */
export function createCatchupEpg(programs: ProgramRepository = programRepository): CatchupEpg {
  return {
    programmesFor: (channel, fromMs, toMs) => windowFor(programs, channel, fromMs, toMs),
    airingAt: (channel, atMs) => airingFor(programs, channel, atMs),
  };
}
