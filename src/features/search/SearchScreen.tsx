import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { useDeferredDown } from './useDeferredDown';
import { useNavigator } from '@/core/navigation/useNavigator';
import { SearchChannelsScreen } from './SearchChannelsScreen';
import { type SearchDeps, searchDeps } from './searchDeps';
import { SearchDetailScreen } from './SearchDetailScreen';
import { SearchHistoryScreen } from './SearchHistoryScreen';
import { SearchOverlayScreen } from './SearchOverlayScreen';
import { SearchProgramsScreen } from './SearchProgramsScreen';
import { isEmptyResults } from './searchResults';
import { SearchTopBarScreen } from './SearchTopBarScreen';
import { type SearchActions, useSearchActions } from './useSearchActions';
import { useSearchHistory } from './useSearchHistory';
import { useSearchOverlay } from './useSearchOverlay';
import { type SearchResultsModel, useSearchResults } from './useSearchResults';

/**
 * The search screen (catalogue §4, captures 49-51). The reference overlays the
 * dimmed live video; telly's search is its own route over the app background
 * (single player engine). OK on a channel or master card tunes it and adopts
 * the guide-root BACK chain; the gear opens Settings; BACK closes overlays
 * first (their trap scopes), then the screen.
 */
export function SearchScreen({ deps = searchDeps }: { deps?: SearchDeps }): JSX.Element {
  const navigator = useNavigator();
  const model = useSearchResults(deps);
  const history = useSearchHistory(deps.history);
  const overlay = useSearchOverlay(deps.overlays);
  const actions = useSearchActions(deps, model, history);
  useDeferredDown(model);
  return (
    <FocusScope id="search" onBack={() => navigator.pop()}>
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-telly-onboarding-bg text-telly-text"
        data-testid="search-screen"
      >
        <SearchTopBarScreen
          query={model.query}
          onQueryChange={model.setQuery}
          onCommit={actions.onCommit}
          downTarget={model.downTarget}
          onVoice={actions.onVoice}
          onOpenSettings={actions.onOpenSettings}
        />
        {isEmptyResults(model.results) ? (
          <SearchHistoryScreen
            entries={history.history}
            onEntry={actions.onHistoryEntry}
            onClear={history.clear}
          />
        ) : (
          <SearchResultsScreen model={model} actions={actions} />
        )}
        <SearchOverlayScreen overlay={overlay} overlays={deps.overlays} />
      </div>
    </FocusScope>
  );
}

/** Channels shelf on top, the two-pane Programs section + detail card below. */
function SearchResultsScreen({
  model,
  actions,
}: {
  model: SearchResultsModel;
  actions: SearchActions;
}): JSX.Element {
  const { channels, programs } = model.results;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {channels.length > 0 && <SearchChannelsScreen hits={channels} onTune={actions.onTune} />}
      {programs.length > 0 && (
        <div className="flex">
          <SearchProgramsScreen
            groups={programs}
            selected={model.selected}
            onTune={actions.onTune}
            onProgramRow={actions.onProgramRow}
          />
          {model.focused !== null && <SearchDetailScreen hit={model.focused} />}
        </div>
      )}
    </div>
  );
}
