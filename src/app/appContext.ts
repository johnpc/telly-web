import { createContext, useContext } from 'react';
import { StartRoute } from './startRoute';

/** App-wide singletons the slices read (Android `ServiceLocator` equivalents). */
export interface AppDeps {
  startRoute: StartRoute;
}

export const AppDepsContext = createContext<AppDeps>({ startRoute: new StartRoute() });

export function useAppDeps(): AppDeps {
  return useContext(AppDepsContext);
}
