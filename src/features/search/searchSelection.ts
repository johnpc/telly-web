// The Programs section's selection (port of the Android ViewModel's
// `selectedChannel` + `focusedProgram`): the master-lane channel whose airings
// the rows pane shows and the airing the detail card renders, RESOLVED from the
// last Programs node focus visited against the current results — a fresh batch
// selects its first channel and preselects that channel's first airing.
import type { ResultsNode } from './searchFocusMemory';
import type { SearchProgramChannel, SearchProgramHit, SearchResults } from './searchResults';

export interface ResolvedSelection {
  selected: SearchProgramChannel | null;
  focused: SearchProgramHit | null;
}

export const NOTHING_SELECTED: ResolvedSelection = { selected: null, focused: null };

export function resolveSelection(results: SearchResults, visited: ResultsNode | null): ResolvedSelection {
  const selected =
    results.programs.find((group) => group.channel.id === visited?.channelId) ?? results.programs[0] ?? null;
  if (selected === null) return NOTHING_SELECTED;
  const startMs = visited?.kind === 'AiringRow' ? visited.startMs : null;
  const focused =
    selected.airings.find((hit) => hit.program.startMs === startMs) ?? selected.airings[0] ?? null;
  return { selected, focused };
}
