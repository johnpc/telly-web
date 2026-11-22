import { useCallback, useContext, useEffect, type JSX, type ReactNode } from 'react';
import { useKeyHandler } from '../input/useKeyHandler';
import type { RemoteKey } from '../input/remoteKeys';
import { focusEngine, type AutoFocus } from './focusEngine';
import { FocusScopeContext } from './focusScopeContext';

interface FocusScopeProps {
  id: string;
  /** Modal: arrows cannot leave this scope (and its nested scopes) while it is mounted. */
  trap?: boolean;
  /** 'remembered' (default) restores this scope's last focus, or its first element, when focus is not already in the active layer; 'first' always focuses the first element; false does nothing. */
  autoFocus?: AutoFocus;
  /** Handles BACK while mounted (pushed on the key router, so the newest scope wins). Requires `RemoteKeysProvider`. */
  onBack?: () => void;
  children?: ReactNode;
}

/** Declares a focus scope (renders no DOM). Nest one inside another to build layers; `trap` makes a modal. */
export function FocusScope({
  id,
  trap = false,
  autoFocus = 'remembered',
  onBack,
  children,
}: FocusScopeProps): JSX.Element {
  const parent = useContext(FocusScopeContext);
  useEffect(() => focusEngine.pushScope({ id, parent, trap, autoFocus }), [id, parent, trap, autoFocus]);
  const handleBack = useCallback(
    (key: RemoteKey): boolean => {
      if (key !== 'BACK' || onBack === undefined) return false;
      onBack();
      return true;
    },
    [onBack],
  );
  useKeyHandler(handleBack, onBack !== undefined);
  return <FocusScopeContext value={id}>{children}</FocusScopeContext>;
}
