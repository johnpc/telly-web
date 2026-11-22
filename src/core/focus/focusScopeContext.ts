import { createContext } from 'react';

/** Id of the nearest enclosing `FocusScope`; focusables register under it. */
export const FocusScopeContext = createContext<string>('root');
