// D-pad keys from the query bar while a search is still in flight: TiviMate's
// results land under the bar a beat after the last keystroke, and the user
// (or the harness) may already be pressing DOWN, RIGHT, RIGHT. Instead of
// letting those keys fall to the geometric move over the vanishing history
// pane, a DOWN opens a hold queue that is replayed in order the moment the
// results arrive — the DOWN then lands on the fresh landing / remembered node
// via the bar's focus override, the rest move from there.
import { useCallback, useState } from 'react';
import { useFocusedId } from '@/core/focus/useFocusedId';
import { type KeyHold, KeyQueue } from '@/core/input/keyQueue';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import { useHoldKeys, useReplayHeldKeys } from '@/core/input/useKeyQueue';
import { SEARCH_IDS } from './searchIds';
import type { SearchResultsModel } from './useSearchResults';

/** True when `key` must wait: the hold is open (a search is pending) and a DOWN from the bar opened (or continues) it. */
export function holdsKey(key: RemoteKey, focusedId: string | null, hold: KeyHold): boolean {
  if (hold.kind !== 'Holding' || !isDirection(key)) return false;
  return hold.keys.length > 0 || (key === 'DOWN' && focusedId === SEARCH_IDS.query);
}

/** The shared `Startup key hold`: Holding while results are pending, replayed one per commit when they land. */
export function useDeferredDown(model: SearchResultsModel): void {
  const [queue] = useState(() => new KeyQueue());
  const focusedId = useFocusedId();
  const holds = useCallback(
    (key: RemoteKey): boolean => holdsKey(key, focusedId, queue.state),
    [focusedId, queue],
  );
  useHoldKeys(queue, holds);
  useReplayHeldKeys(queue, !model.pending);
}
