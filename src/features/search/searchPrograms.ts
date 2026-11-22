// The Programs master lane (port of the Android builder's programme half,
// ref-round6 §D): one entry per channel with a matching programme, ordered by
// channel name (case-insensitive, ties by number), each carrying all of its
// airings chronologically. Hidden and unknown channels drop out with their airings.
import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import type { ClockStyle } from './programTimes';
import { byNameThenNumber } from './searchQuery';
import { type SearchProgramChannel, programHit } from './searchResults';

/** First visible channel wins when several share an EPG id (remap-aware). */
export function channelsByEpgId(channels: readonly ChannelRow[]): Map<string, ChannelRow> {
  const map = new Map<string, ChannelRow>();
  for (const channel of channels) {
    const id = epgId(channel);
    if (id !== null && !map.has(id)) map.set(id, channel);
  }
  return map;
}

function append(groups: Map<string, ProgramRow[]>, program: ProgramRow): void {
  const list = groups.get(program.channelTvgId) ?? [];
  list.push(program);
  groups.set(program.channelTvgId, list);
}

function groupByChannel(matches: readonly ProgramRow[]): Map<string, ProgramRow[]> {
  const groups = new Map<string, ProgramRow[]>();
  for (const program of matches) append(groups, program);
  return groups;
}

function groupOf(
  channel: ChannelRow,
  airings: readonly ProgramRow[],
  atMs: number,
  style: ClockStyle,
): SearchProgramChannel {
  const sorted = [...airings].sort((a, b) => a.startMs - b.startMs);
  return { channel, airings: sorted.map((program) => programHit(program, channel, atMs, style)) };
}

export function buildProgramChannels(
  matches: readonly ProgramRow[],
  channels: readonly ChannelRow[],
  atMs: number,
  style: ClockStyle,
): SearchProgramChannel[] {
  const byId = channelsByEpgId(channels);
  const out: SearchProgramChannel[] = [];
  for (const [tvgId, airings] of groupByChannel(matches)) {
    const channel = byId.get(tvgId);
    if (channel !== undefined) out.push(groupOf(channel, airings, atMs, style));
  }
  return out.sort((a, b) => byNameThenNumber(a.channel, b.channel));
}
