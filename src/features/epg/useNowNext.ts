import { useLiveQuery } from 'dexie-react-hooks';
import { offsetsOfMinutes, queryFrom, shifted } from './epgOffsets';
import { type NowNext, resolveNowNext } from './nowNext';
import { defaultGuideDeps, type GuideQueryDeps } from './useProgramsInRange';

/**
 * Per-channel now/next at `atMs`, offsets applied, live (Android
 * `EpgRepository.nowNext`). Channels without data are absent from the map;
 * undefined until the first read.
 */
export function useNowNext(
  tvgIds: readonly string[],
  atMs: number,
  deps: GuideQueryDeps = defaultGuideDeps,
): Map<string, NowNext> | undefined {
  const key = tvgIds.join('\n');
  return useLiveQuery(async () => {
    const offsets = offsetsOfMinutes(await deps.channels.epgOffsets());
    const rows = await deps.programs.airingOrUpcoming(
      key === '' ? [] : key.split('\n'),
      queryFrom(atMs, offsets),
    );
    return resolveNowNext(shifted(rows, offsets), atMs);
  }, [key, atMs, deps]);
}
