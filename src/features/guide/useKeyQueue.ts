import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useKeyRouter } from '@/core/input/keyRouterContext';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import type { KeyQueue } from './keyQueue';

/** While `loading`, every key is parked in `queue` instead of reaching the shell. */
export function useQueueWhileLoading(queue: KeyQueue, loading: boolean): void {
  const handler = useCallback(
    (key: RemoteKey): boolean => {
      if (!loading) return false;
      queue.push(key);
      return true;
    },
    [queue, loading],
  );
  useKeyHandler(handler);
}

/**
 * Once `ready`, replays the parked keys through the router ONE PER COMMIT:
 * each key's layer change renders before the next key is routed, exactly
 * as if the remote had waited for the screen (a BACK-BACK pair must open the
 * groups column, then land on the gear it just rendered).
 */
export function useReplayQueuedKeys(queue: KeyQueue, ready: boolean): void {
  const router = useKeyRouter();
  const pending = useSyncExternalStore(queue.subscribe, () => queue.size);
  useEffect(() => {
    // `size !== pending` = this commit's key already went (StrictMode re-runs mount effects).
    if (!ready || pending === 0 || queue.size !== pending) return;
    const key = queue.shift();
    if (key !== undefined) router.dispatch(key);
  }, [queue, ready, router, pending]);
}
