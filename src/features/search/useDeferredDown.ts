// D-pad keys from the query bar while a search is still in flight: TiviMate's
// results land under the bar a beat after the last keystroke, and the user
// (or the harness) may already be pressing DOWN, RIGHT, RIGHT. Instead of
// letting those keys fall to the geometric move over the vanishing history
// pane, a DOWN opens a hold queue that is replayed in order the moment the
// results arrive — the DOWN then lands on the fresh landing / remembered node
// via the bar's focus override, the rest move from there.
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useFocusedId } from '@/core/focus/useFocusedId';
import type { KeyRouter } from '@/core/input/keyRouter';
import { useKeyRouter } from '@/core/input/keyRouterContext';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import { SEARCH_IDS } from './searchIds';
import type { SearchResultsModel } from './useSearchResults';

/** True when `key` must wait: a search is pending and a DOWN from the bar opened (or continues) the hold. */
export function holdsKey(
  key: RemoteKey,
  pending: boolean,
  focusedId: string | null,
  queued: number,
): boolean {
  if (!pending || !isDirection(key)) return false;
  return queued > 0 || (key === 'DOWN' && focusedId === SEARCH_IDS.query);
}

export function useDeferredDown(model: SearchResultsModel): void {
  const queue = useRef<RemoteKey[]>([]);
  const focusedId = useFocusedId();
  const onKey = useCallback(
    (key: RemoteKey): boolean => {
      if (!holdsKey(key, model.pending, focusedId, queue.current.length)) return false;
      queue.current.push(key);
      return true;
    },
    [focusedId, model.pending],
  );
  useKeyHandler(onKey);
  useReplayWhenLanded(queue, model.pending);
}

/** Replays the held keys, in order, once the results for the typed query are on screen. */
function useReplayWhenLanded(queueRef: RefObject<RemoteKey[]>, pending: boolean): void {
  const router: KeyRouter = useKeyRouter();
  useEffect(() => {
    if (pending) return;
    const held = queueRef.current;
    queueRef.current = [];
    for (const key of held) router.dispatch(key);
  }, [queueRef, router, pending]);
}
