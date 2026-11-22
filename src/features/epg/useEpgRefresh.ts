import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { usePlaylists } from '../playlist/usePlaylists';
import type { EpgRefresherDeps } from './epgRefresher';
import { epgSignature } from './epgTriggers';
import { createEpgRefresher } from './epgWiring';

export type EpgRefreshMode = 'due' | 'all' | 'playlistsChanged';

/**
 * EPG refresh as one TanStack mutation: `mutate('all')` is Settings ->
 * "Update EPG"; `'due'` applies the freshness policy; `'playlistsChanged'`
 * fires automatically whenever the set of (playlist URL, EPG URL) pairs
 * changes — never on the refresher's own stamp writes (Android `EpgTriggers`).
 */
export function useEpgRefresh(
  overrides: Partial<EpgRefresherDeps> = {},
): UseMutationResult<number[], Error, EpgRefreshMode> {
  const settings = useSettingsRepository();
  // Overrides are test seams; callers pass a stable object (or none).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refresher = useMemo(() => createEpgRefresher(settings, overrides), [settings]);
  const mutation = useMutation({
    mutationFn: (mode: EpgRefreshMode): Promise<number[]> => {
      if (mode === 'all') return refresher.refreshAllNow();
      if (mode === 'due') return refresher.refreshDue();
      return refresher.onPlaylistsChanged(settings.get(TellySettings.EPG_UPDATE_ON_PLAYLISTS_CHANGE));
    },
  });
  const livePlaylists = usePlaylists(overrides.playlists);
  const signature = livePlaylists === undefined ? null : epgSignature(livePlaylists);
  const { mutate } = mutation;
  useOnChange(signature, () => mutate('playlistsChanged'));
  return mutation;
}

/**
 * Fires `onChange` when `value` differs from the last non-null value seen. The
 * first resolved value is the baseline (Android `collectIndexed` index 0 runs
 * the due policy, which `useBackgroundRefresh` already does), never a trigger.
 */
function useOnChange(value: string | null, onChange: () => void): void {
  const seen = useRef(value);
  useEffect(() => {
    const previous = seen.current;
    if (value === null || previous === value) return;
    seen.current = value;
    if (previous !== null) onChange();
    // onChange is a fresh closure each render; only the value drives this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
