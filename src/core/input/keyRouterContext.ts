import { createContext, useContext } from 'react';
import type { KeyRouter } from './keyRouter';

export const KeyRouterContext = createContext<KeyRouter | null>(null);

/** The app-wide key router; throws outside `RemoteKeysProvider`. */
export function useKeyRouter(): KeyRouter {
  const router = useContext(KeyRouterContext);
  if (router === null) throw new Error('useKeyRouter must be used inside <RemoteKeysProvider>');
  return router;
}
