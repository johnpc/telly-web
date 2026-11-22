import { useEffect, useRef } from 'react';
import type { KeyHandler } from './keyRouter';
import { useKeyRouter } from './keyRouterContext';

/**
 * Pushes `handler` onto the key router for as long as the component is
 * mounted (and `enabled`). The most recently mounted component is on top, so
 * an overlay rendered later sees keys before the screen beneath it. The
 * latest `handler` is always called — no dependency list needed, and the
 * stack position never changes on re-render.
 */
export function useKeyHandler(handler: KeyHandler, enabled = true): void {
  const router = useKeyRouter();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  }, [handler]);
  useEffect(() => {
    if (!enabled) return undefined;
    return router.push((key) => latest.current(key));
  }, [router, enabled]);
}
