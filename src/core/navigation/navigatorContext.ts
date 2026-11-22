import { createContext, useContext } from 'react';
import type { Navigator } from './navigator';

export const NavigatorContext = createContext<Navigator | null>(null);

/** The app navigator (push / pop / replaceAll); throws outside `NavigatorProvider`. */
export function useNavigator(): Navigator {
  const navigator = useContext(NavigatorContext);
  if (navigator === null) throw new Error('useNavigator must be used inside <NavigatorProvider>');
  return navigator;
}
