import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { focusEngine, type FocusEngine } from '../focus/focusEngine';
import { KeyRouter } from './keyRouter';
import { KeyRouterContext } from './keyRouterContext';
import { useRemoteKeys } from './useRemoteKeys';

interface RemoteKeysProviderProps {
  /** Called when nobody handled BACK — normally `navigator.pop()`. */
  onBack: () => void;
  /** Focus engine arrows fall through to; defaults to the app singleton. */
  engine?: FocusEngine;
  children?: ReactNode;
}

/** Owns the app's `KeyRouter` and wires window keys + gamepad into it. */
export function RemoteKeysProvider({
  onBack,
  engine = focusEngine,
  children,
}: RemoteKeysProviderProps): JSX.Element {
  const [router] = useState(
    () =>
      new KeyRouter({
        moveFocus: (direction) => engine.move(direction),
        activate: () => engine.activate(),
        back: onBack,
      }),
  );
  useEffect(() => {
    router.setFallbacks({ back: onBack });
  }, [router, onBack]);
  useRemoteKeys(router);
  return <KeyRouterContext value={router}>{children}</KeyRouterContext>;
}
