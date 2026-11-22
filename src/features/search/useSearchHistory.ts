// The landing list + commit/clear over `SearchHistory`, as React state.
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { type SearchHistory, parseHistory } from './searchHistory';

export interface SearchHistoryModel {
  history: string[];
  /** IME search action / result OK: commit the query into the history. */
  commit(raw: string): void;
  clear(): void;
}

export function useSearchHistory(history: SearchHistory): SearchHistoryModel {
  const serialized = useSyncExternalStore(history.subscribe, () => history.serialized());
  const list = useMemo(() => parseHistory(serialized), [serialized]);
  const commit = useCallback((raw: string) => history.record(raw), [history]);
  const clear = useCallback(() => history.clear(), [history]);
  return { history: list, commit, clear };
}
