// Where focus returns when an overlay closes. The focus engine recovers a
// vanished node by GEOMETRY (nearest neighbour) before a popped scope's memory
// gets its turn, so a dropdown anchored top-right would hand focus to the gear
// instead of the row that opened it. The host captures the focused node the
// moment the overlay appears (layout phase, before the overlay's own scope
// auto-focuses) and re-focuses it synchronously on close, which the deferred
// recovery then respects.
import { useLayoutEffect, useRef } from 'react';
import { type FocusEngine, focusEngine } from '@/core/focus/focusEngine';

export function restoreFocus(id: string | null, engine: FocusEngine = focusEngine): boolean {
  return id !== null && engine.focus(id);
}

/** While `active` is true the anchor is the node focused when it turned true; the result restores it. */
export function useFocusAnchor(active: boolean, engine: FocusEngine = focusEngine): () => void {
  const anchor = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (active) anchor.current = engine.current;
  }, [active, engine]);
  return () => {
    restoreFocus(anchor.current, engine);
  };
}
