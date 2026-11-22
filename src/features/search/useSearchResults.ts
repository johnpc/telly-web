// Search-screen results state (port of Android `SearchViewModel`'s results
// half): live results per keystroke, the selected master channel and the
// detail card's airing derived from the focus memory, and the voice
// transcript handed into the query exactly once.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useFocusedId } from '@/core/focus/useFocusedId';
import { useSetting } from '@/core/settings/useSetting';
import { TellySettings } from '@/core/settings/tellySettings';
import { clockStyleOf } from './programTimes';
import { normalizeQuery } from './searchQuery';
import { type SearchDeps, searchDeps } from './searchDeps';
import { type FocusMemoryState, downTarget, resultNodes } from './searchFocusMemory';
import {
  EMPTY_RESULTS,
  type SearchProgramChannel,
  type SearchProgramHit,
  type SearchResults,
} from './searchResults';
import { resolveSelection } from './searchSelection';

export interface SearchResultsModel {
  query: string;
  setQuery(text: string): void;
  results: SearchResults;
  selected: SearchProgramChannel | null;
  focused: SearchProgramHit | null;
  /** The id DOWN from the query bar lands on (null = plain spatial move). */
  downTarget: string | null;
  /** True while the results still belong to an earlier query. */
  pending: boolean;
}

export function useSearchResults(deps: SearchDeps = searchDeps): SearchResultsModel {
  const [query, setQuery] = useState('');
  const results = useLiveResults(deps, query);
  useVoiceTranscript(deps, setQuery);
  const memory = useFocusMemory(deps, results);
  const { selected, focused } = useMemo(
    () => resolveSelection(results, memory.programs),
    [results, memory.programs],
  );
  return {
    query,
    setQuery,
    results,
    selected,
    focused,
    downTarget: downTarget(memory.remembered, results, selected?.channel.id ?? null),
    pending: results.query !== normalizeQuery(query),
  };
}

/** Results recompute on every keystroke (TiviMate searches as you type); a stale response is dropped. */
function useLiveResults(deps: SearchDeps, query: string): SearchResults {
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [clockFormat] = useSetting(TellySettings.CLOCK_FORMAT);
  useEffect(() => {
    let stale = false;
    void deps.repository.search(query, deps.clock(), clockStyleOf(clockFormat)).then((next) => {
      if (stale) return;
      // A new batch forgets the focus memory: fresh landing + first master channel.
      deps.focusMemory.clear();
      setResults(next);
    });
    return () => {
      stale = true;
    };
  }, [deps, query, clockFormat]);
  return results;
}

/** Feeds every results-node focus into the memory and reads it back as state. */
function useFocusMemory(deps: SearchDeps, results: SearchResults): FocusMemoryState {
  const focusedId = useFocusedId();
  const nodes = useMemo(() => resultNodes(results), [results]);
  useEffect(() => deps.focusMemory.onFocused(focusedId, nodes), [deps, focusedId, nodes]);
  return useSyncExternalStore(deps.focusMemory.subscribe, deps.focusMemory.snapshot);
}

/** A recognized voice transcript becomes the typed query (TiviMate hands voice results straight into the bar). */
function useVoiceTranscript(deps: SearchDeps, setQuery: (text: string) => void): void {
  useEffect(
    () =>
      deps.voice.subscribe(() => {
        const text = deps.voice.consume();
        if (text !== null) setQuery(text);
      }),
    [deps, setQuery],
  );
}
