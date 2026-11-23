import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import { offsetsOfMinutes, queryFrom, shifted } from '@/features/epg/epgOffsets';
import { resolveNowNext } from '@/features/epg/nowNext';
import { type GuideQueryDeps, defaultGuideDeps } from '@/features/epg/useProgramsInRange';

/**
 * The programme airing on `channel` at `atMs`, offsets applied — the
 * non-React twin of `useNowNext` for hosts whose sheet acts outside a
 * render (the panel's "Add to My list" saves the airing programme).
 */
export async function airingProgramme(
  channel: ChannelRow,
  atMs: number,
  deps: GuideQueryDeps = defaultGuideDeps,
): Promise<ProgramRow | null> {
  const id = epgId(channel);
  if (id === null) return null;
  const offsets = offsetsOfMinutes(await deps.channels.epgOffsets());
  const rows = await deps.programs.airingOrUpcoming([id], queryFrom(atMs, offsets));
  return resolveNowNext(shifted(rows, offsets), atMs).get(id)?.now ?? null;
}
