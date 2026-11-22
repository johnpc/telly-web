import { useCallback, useContext, useMemo, useSyncExternalStore, type RefCallback } from 'react';
import { focusEngine, type FocusEngine } from './focusEngine';
import { FocusScopeContext } from './focusScopeContext';

/** Spread onto the element: focusable by script/tap but not by Tab, identified, and synced on native focus. */
export interface FocusableProps {
  tabIndex: -1;
  'data-focus-id': string;
  'data-focused': 'true' | undefined;
  onFocus: () => void;
}

export interface UseFocusableResult {
  ref: RefCallback<HTMLElement>;
  focused: boolean;
  props: FocusableProps;
}

/**
 * Makes a DOM element part of spatial navigation under the enclosing
 * `FocusScope`. OK on it calls `element.click()`, so a plain `onClick` serves
 * the remote, the pointer and touch alike. Hover never moves focus.
 */
export function useFocusable(id: string, engine: FocusEngine = focusEngine): UseFocusableResult {
  const scope = useContext(FocusScopeContext);
  const ref = useCallback<RefCallback<HTMLElement>>(
    (element) => (element === null ? undefined : engine.register(id, scope, element)),
    [engine, id, scope],
  );
  const focused = useSyncExternalStore(engine.subscribe, () => engine.current === id);
  const props = useMemo<FocusableProps>(
    () => ({
      tabIndex: -1,
      'data-focus-id': id,
      'data-focused': focused ? 'true' : undefined,
      onFocus: () => engine.syncFromDom(id),
    }),
    [engine, id, focused],
  );
  return { ref, focused, props };
}
