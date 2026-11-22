import { useLiveQuery } from 'dexie-react-hooks';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type ProgramRepository, programRepository } from '@/core/db/programRepository';
import type { ProgramRow } from '@/core/db/types';
import { offsetsOfMinutes, queryFrom, queryTo, windowed } from './epgOffsets';

export interface GuideQueryDeps {
  programs: ProgramRepository;
  channels: ChannelRepository;
}

export const defaultGuideDeps: GuideQueryDeps = { programs: programRepository, channels: channelRepository };

/**
 * Programmes overlapping [fromMs, toMs) for `tvgIds` — the guide window,
 * live. Times come back SHIFTED by each channel's "EPG time offset"
 * (Android `EpgRepository.programsFor`); undefined until the first read.
 */
export function useProgramsInRange(
  tvgIds: readonly string[],
  fromMs: number,
  toMs: number,
  deps: GuideQueryDeps = defaultGuideDeps,
): ProgramRow[] | undefined {
  const key = tvgIds.join('\n');
  return useLiveQuery(async () => {
    const offsets = offsetsOfMinutes(await deps.channels.epgOffsets());
    const rows = await deps.programs.window(
      key === '' ? [] : key.split('\n'),
      queryFrom(fromMs, offsets),
      queryTo(toMs, offsets),
    );
    return windowed(rows, offsets, fromMs, toMs);
  }, [key, fromMs, toMs, deps]);
}
