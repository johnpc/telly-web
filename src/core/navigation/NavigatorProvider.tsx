import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { Navigator } from './navigator';
import { NavigatorContext } from './navigatorContext';
import type { Route } from './routes';

interface NavigatorProviderProps {
  /** Root route when no `navigator` is supplied (defaults to Welcome, as on Android). */
  start?: Route;
  /** A pre-built navigator (tests); otherwise one bound to `window.history` is created. */
  navigator?: Navigator;
  children?: ReactNode;
}

/** Owns the app `Navigator` and feeds browser `popstate` (hardware BACK) into it. */
export function NavigatorProvider({ start, navigator, children }: NavigatorProviderProps): JSX.Element {
  const [instance] = useState(() => navigator ?? new Navigator(start, window.history));
  useEffect(() => {
    const onPopState = (e: PopStateEvent): void => instance.onPopState(e.state);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [instance]);
  return <NavigatorContext value={instance}>{children}</NavigatorContext>;
}
