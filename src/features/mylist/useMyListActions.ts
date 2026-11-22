// The My List screen's row actions (port of the Android screen's click
// wiring): OK on an airing row tunes its channel and adopts the guide-root
// BACK chain, OK on a future row shows its description, long-OK removes the
// focused row, BACK closes the description first.
import { useCallback, useState } from 'react';
import { useFocusedId } from '@/core/focus/useFocusedId';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useNavigator } from '@/core/navigation/useNavigator';
import { usePlaybackSession } from '@/features/playback/tune';
import { type MyListScreenRow, myListRowId } from './myListRows';
import type { MyListModel } from './useMyList';

export interface MyListActions {
  described: MyListScreenRow | null;
  closeDescription(): void;
  onRow(row: MyListScreenRow): void;
}

export function useMyListActions(model: MyListModel): MyListActions {
  const tune = useTuneRow();
  const [described, setDescribed] = useState<MyListScreenRow | null>(null);
  useLongOkRemove(model, described === null);
  const onRow = useCallback(
    (row: MyListScreenRow): void => (row.airing ? tune(row) : setDescribed(row)),
    [tune],
  );
  return { described, closeDescription: () => setDescribed(null), onRow };
}

/** OK on an airing row: tune its channel, guide root beneath fullscreen playback. */
function useTuneRow(): (row: MyListScreenRow) => void {
  const navigator = useNavigator();
  const session = usePlaybackSession();
  return useCallback(
    (row) => {
      session?.tuner.tune(row.channel);
      navigator.replaceAll({ kind: 'Guide' });
      navigator.push({ kind: 'Playback' });
    },
    [navigator, session],
  );
}

/** Long-OK on the focused row removes it (while no description covers the list). */
function useLongOkRemove(model: MyListModel, enabled: boolean): void {
  const focusedId = useFocusedId();
  const onKey = useCallback(
    (key: RemoteKey): boolean => {
      const row = model.rows?.find((candidate) => myListRowId(candidate) === focusedId);
      if (key !== 'LONG_OK' || row === undefined) return false;
      void model.remove(row);
      return true;
    },
    [focusedId, model],
  );
  useKeyHandler(onKey, enabled);
}
