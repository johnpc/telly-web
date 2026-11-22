// The search screen's actions (port of the Android ViewModel's command half):
// OK on a channel / master card commits the query and tunes with the
// guide-root BACK chain, OK on an airing row opens the dropdown, a history
// entry re-runs its query, the gear opens Settings.
import type { ChannelRow } from '@/core/db/types';
import { useNavigator } from '@/core/navigation/useNavigator';
import { usePlaybackSession } from '@/features/playback/tune';
import type { SearchDeps } from './searchDeps';
import type { SearchProgramHit } from './searchResults';
import type { SearchHistoryModel } from './useSearchHistory';
import type { SearchResultsModel } from './useSearchResults';

export interface SearchActions {
  onTune(channel: ChannelRow): void;
  onProgramRow(hit: SearchProgramHit): void;
  onHistoryEntry(entry: string): void;
  onCommit(): void;
  onVoice(): void;
  onOpenSettings(): void;
}

export function useSearchActions(
  deps: SearchDeps,
  model: SearchResultsModel,
  history: SearchHistoryModel,
): SearchActions {
  const navigator = useNavigator();
  const session = usePlaybackSession();
  return {
    onTune: (channel) => {
      history.commit(model.query);
      session?.tuner.tune(channel);
      navigator.replaceAll({ kind: 'Guide' });
      navigator.push({ kind: 'Playback' });
    },
    onProgramRow: (hit) => {
      history.commit(model.query);
      deps.overlays.show({ kind: 'ProgramMenu', hit });
    },
    onHistoryEntry: (entry) => {
      model.setQuery(entry);
      history.commit(entry);
    },
    onCommit: () => history.commit(model.query),
    onVoice: () => deps.voice.start(),
    onOpenSettings: () => navigator.push({ kind: 'Settings' }),
  };
}
