import { useState, useSyncExternalStore, type JSX } from 'react';
import { KeyRouterContext, useKeyRouter } from '@/core/input/keyRouterContext';
import { useNavigator } from '@/core/navigation/useNavigator';
import { screenFor } from './screens';
import { mutedKeyRouter, stackLayers } from './underlay';

/**
 * The route stack's visible layers: the base screen (the top route, or the
 * one a sheet route such as Settings sits over) and, above it, the sheet. A
 * base beneath a sheet STAYS MOUNTED — its player keeps playing, its state
 * survives — but is inert: no DOM focus, hidden from assistive tech, and its
 * key handlers register on a router nothing dispatches into.
 */
export function ScreenStackScreen(): JSX.Element {
  const navigator = useNavigator();
  const router = useKeyRouter();
  const [muted] = useState(mutedKeyRouter);
  const stack = useSyncExternalStore(navigator.subscribe, () => navigator.stack);
  const { top, base, inert } = stackLayers(stack);
  return (
    <div className="relative h-full w-full bg-telly-background" data-testid="app-root" data-route={top.kind}>
      <div
        key={base.kind}
        className="absolute inset-0"
        inert={inert}
        aria-hidden={inert}
        data-underlay={inert}
      >
        <KeyRouterContext value={inert ? muted : router}>{screenFor(base)}</KeyRouterContext>
      </div>
      {inert && <div className="absolute inset-0">{screenFor(top)}</div>}
    </div>
  );
}
