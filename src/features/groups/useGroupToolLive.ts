import { useLiveQuery } from 'dexie-react-hooks';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type ProgramRepository, programRepository } from '@/core/db/programRepository';
import type { ChannelRow } from '@/core/db/types';
import type { GroupToolLive } from './groupToolSession';
import { useCustomGroups } from './useCustomGroups';

const NO_CHANNELS: ChannelRow[] = [];
const NO_IDS: string[] = [];

/** The live tables every group/bulk tool screen reads (all channels, custom groups, EPG ids). */
export function useGroupToolLive(
  channels: ChannelRepository = channelRepository,
  programs: ProgramRepository = programRepository,
): GroupToolLive {
  const all = useLiveQuery(() => channels.all(), [channels]) ?? NO_CHANNELS;
  const epgIds = useLiveQuery(() => programs.channelIds(), [programs]) ?? NO_IDS;
  const groups = useCustomGroups();
  return { channels: all, groups, epgIds };
}
