import { useSyncExternalStore } from 'react';
import { focusEngine, type FocusEngine } from './focusEngine';

/** The currently focused element's id (null when nothing is focused), for "focused row" derived UI. */
export function useFocusedId(engine: FocusEngine = focusEngine): string | null {
  return useSyncExternalStore(engine.subscribe, () => engine.current);
}
