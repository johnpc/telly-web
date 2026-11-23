import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { offsetsOfMinutes, queryFrom, shifted } from './epgOffsets';
import { type NowNext, resolveNowNext } from './nowNext';
import { type NowNextCache, sharedNowNextCache } from './nowNextCache';
import { defaultGuideDeps, type GuideQueryDeps } from './useProgramsInRange';

/** One live answer, stamped with the exact ids + instant it is for. */
interface LiveNowNext {
  key: string;
  atMs: number;
  map: Map<string, NowNext>;
}

function idsOf(key: string): string[] {
  return key === '' ? [] : key.split('\n');
}

async function readLive(
  deps: GuideQueryDeps,
  cache: NowNextCache,
  ids: readonly string[],
  atMs: number,
): Promise<LiveNowNext> {
  const offsets = offsetsOfMinutes(await deps.channels.epgOffsets());
  const rows = await deps.programs.airingOrUpcoming(ids, queryFrom(atMs, offsets));
  const map = resolveNowNext(shifted(rows, offsets), atMs);
  cache.store(ids, map);
  return { key: ids.join('\n'), atMs, map };
}

/**
 * Per-channel now/next at `atMs`, offsets applied, live (Android
 * `EpgRepository.nowNext`). Channels without data are absent from the map.
 * The first paint is served from the shared in-memory cache when every id is
 * known and still valid; undefined only while a genuinely unknown set resolves.
 * Dexie keeps handing out the PREVIOUS query's value while a new one runs, so
 * a result is only trusted for the exact (ids, instant) it answers.
 */
export function useNowNext(
  tvgIds: readonly string[],
  atMs: number,
  deps: GuideQueryDeps = defaultGuideDeps,
  cache: NowNextCache = sharedNowNextCache,
): Map<string, NowNext> | undefined {
  const key = tvgIds.join('\n');
  const ids = useMemo(() => idsOf(key), [key]);
  const live = useLiveQuery(() => readLive(deps, cache, ids, atMs), [ids, atMs, deps, cache]);
  return live?.key === key && live.atMs === atMs ? live.map : cache.read(ids, atMs);
}
