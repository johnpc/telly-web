import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { KeyQueue } from './keyQueue';
import { useKeyRouter } from './keyRouterContext';
import type { RemoteKey } from './remoteKeys';
import { useKeyHandler } from './useKeyHandler';

/**
 * Parks keys in `queue` while it is Holding. Call it AFTER the screen's own
 * `useKeyHandler`s so its handler sits above them on the router stack; `holds`
 * narrows which keys wait (default: every key).
 */
export function useHoldKeys(queue: KeyQueue, holds: (key: RemoteKey) => boolean = (): boolean => true): void {
  const handler = useCallback((key: RemoteKey): boolean => holds(key) && queue.hold(key), [queue, holds]);
  useKeyHandler(handler);
}

/**
 * Drives the queue's readiness and replays the held keys through the router
 * ONE PER COMMIT: each key's layer change renders before the next key is
 * routed (a BACK-BACK pair must open the groups column, then land on the
 * gear it just rendered).
 */
export function useReplayHeldKeys(queue: KeyQueue, ready: boolean): void {
  const router = useKeyRouter();
  const version = useSyncExternalStore(queue.subscribe, () => queue.version);
  useEffect(() => queue.setReady(ready), [queue, ready]);
  useEffect(() => {
    const key = queue.replayOne(version);
    if (key !== undefined) router.dispatch(key);
  }, [queue, router, version]);
}
