import { useSyncExternalStore } from 'react';
import { useNavigator } from './navigatorContext';
import type { Route } from './routes';

/** The route on screen; re-renders on every push / pop / replaceAll. */
export function useRoute(): Route {
  const navigator = useNavigator();
  return useSyncExternalStore(navigator.subscribe, () => navigator.current);
}
