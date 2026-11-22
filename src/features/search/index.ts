export { SearchScreen } from './SearchScreen';
export { type SearchDeps, createSearchDeps, searchDeps } from './searchDeps';
export { SEARCH_HISTORY_KEY, SearchHistory } from './searchHistory';
export { type SearchHistoryModel, useSearchHistory } from './useSearchHistory';
export * from './programTimes';

import { searchDeps as deps } from './searchDeps';

/** Settings -> Other -> Search -> "Clear search history" (after its confirm). */
export function clearSearchHistory(): void {
  deps.history.clear();
}
