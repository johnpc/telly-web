import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import {
  type GroupVisibility,
  ALL_CHANNELS,
  FAVORITES,
  channelsIn,
  groupNames,
  visibleGroupNames,
} from '@/core/channels/channelGroups';
import { buildCells } from './guideCellsBuilder';
import type { GuideRow } from './guideModel';
import type { GuideSpan } from './guideWindowMath';

export { type GroupVisibility, ALL_CHANNELS, FAVORITES, channelsIn, groupNames, visibleGroupNames };

/** The EPG ids the window query must cover for the group's channels. */
export function epgIdsOf(channels: readonly ChannelRow[]): string[] {
  return [...new Set(channels.map(epgId).filter((id): id is string => id !== null))];
}

function append(schedule: Map<string, ProgramRow[]>, program: ProgramRow): void {
  const key = program.channelTvgId;
  const list = schedule.get(key) ?? [];
  list.push(program);
  schedule.set(key, list);
}

function byTvgId(programs: readonly ProgramRow[]): Map<string, ProgramRow[]> {
  const schedule = new Map<string, ProgramRow[]>();
  for (const program of programs) append(schedule, program);
  return schedule;
}

/** Assembles the grid rows for a group: filter, per-group renumbering from 1, one cell strip per channel. */
export function buildRows(
  groupChannels: readonly ChannelRow[],
  group: string,
  span: GuideSpan,
  programs: readonly ProgramRow[],
): GuideRow[] {
  const schedule = byTvgId(programs);
  const programsOf = (channel: ChannelRow): ProgramRow[] => schedule.get(epgId(channel) ?? '') ?? [];
  return groupChannels.map((channel, index) => ({
    channel,
    displayNumber: group === ALL_CHANNELS ? channel.number : index + 1,
    cells: buildCells(programsOf(channel), span),
  }));
}
