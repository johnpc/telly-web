// Everything the search screen needs from the composition root (port of
// Android `SearchDeps`): the repository, the committed-query history (its
// store honors the save toggle), the overlay stack and the voice seam.
import { LocalStorageKeyValueStore } from '@/core/kv/localStorageKeyValueStore';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { SearchFocusMemory } from './searchFocusMemory';
import { SearchHistory } from './searchHistory';
import { SearchOverlays } from './searchOverlay';
import { type SearchRepository, searchRepository } from './searchRepository';
import { VoiceSearch } from './voiceSearch';

export interface SearchDeps {
  repository: SearchRepository;
  history: SearchHistory;
  overlays: SearchOverlays;
  voice: VoiceSearch;
  clock: () => number;
  focusMemory: SearchFocusMemory;
}

export function createSearchDeps(
  settings: SettingsRepository = defaultSettingsRepository,
  overrides: Partial<SearchDeps> = {},
): SearchDeps {
  const store = typeof window === 'undefined' ? new MemoryKeyValueStore() : new LocalStorageKeyValueStore();
  return {
    repository: searchRepository,
    history: new SearchHistory(store, () => settings.get(TellySettings.SEARCH_SAVE_HISTORY)),
    overlays: new SearchOverlays(),
    voice: new VoiceSearch(),
    clock: () => Date.now(),
    focusMemory: new SearchFocusMemory(),
    ...overrides,
  };
}

export const searchDeps: SearchDeps = createSearchDeps();
