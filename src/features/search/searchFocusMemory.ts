// Results-area focus memory (port of Android `SearchFocusMemory` + the
// ViewModel's selection): the last results node D-pad focus visited — DOWN
// from the query bar restores it (leanback focus memory, round7 §C4) — and the
// last Programs node visited, which selects the master-lane channel whose
// airings the rows pane shows. A new result batch clears both (fresh landing:
// first channel card, else first airing row; first master channel selected).
import { airingRowId, channelCardId, masterCardId } from './searchIds';
import type { SearchResults } from './searchResults';

export type ResultsNode =
  | { kind: 'ChannelCard'; channelId: number }
  | { kind: 'MasterCard'; channelId: number }
  | { kind: 'AiringRow'; channelId: number; startMs: number };

export function nodeId(node: ResultsNode): string {
  if (node.kind === 'ChannelCard') return channelCardId(node.channelId);
  if (node.kind === 'MasterCard') return masterCardId(node.channelId);
  return airingRowId(node.channelId, node.startMs);
}

/** Every focusable results node of `results` (airing rows of every channel; only the selected ones render). */
export function resultNodes(results: SearchResults): ResultsNode[] {
  const nodes: ResultsNode[] = results.channels.map((hit) => ({
    kind: 'ChannelCard',
    channelId: hit.channel.id,
  }));
  for (const group of results.programs) {
    nodes.push({ kind: 'MasterCard', channelId: group.channel.id });
    for (const hit of group.airings)
      nodes.push({ kind: 'AiringRow', channelId: hit.channel.id, startMs: hit.program.startMs });
  }
  return nodes;
}

export interface FocusMemoryState {
  /** The node DOWN from the query bar restores; null = fresh landing. */
  remembered: ResultsNode | null;
  /** The last Programs node visited; drives the selected master channel + detail card. */
  programs: ResultsNode | null;
}

const EMPTY: FocusMemoryState = { remembered: null, programs: null };

export class SearchFocusMemory {
  private state: FocusMemoryState = EMPTY;
  private readonly listeners = new Set<() => void>();

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly snapshot = (): FocusMemoryState => this.state;

  /** `focusedId` took focus: results nodes stick, anything else is ignored. */
  onFocused(focusedId: string | null, nodes: readonly ResultsNode[]): void {
    const node = nodes.find((candidate) => nodeId(candidate) === focusedId);
    if (node === undefined) return;
    this.set({ remembered: node, programs: node.kind === 'ChannelCard' ? this.state.programs : node });
  }

  clear(): void {
    if (this.state !== EMPTY) this.set(EMPTY);
  }

  private set(state: FocusMemoryState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

/** The id DOWN from the query bar lands on; null keeps the plain spatial move (history landing). */
export function downTarget(
  remembered: ResultsNode | null,
  results: SearchResults,
  selectedChannelId: number | null,
): string | null {
  return restoredTarget(remembered, results) ?? freshLanding(results, selectedChannelId);
}

/** The remembered node's id while it is still part of the results. */
function restoredTarget(remembered: ResultsNode | null, results: SearchResults): string | null {
  if (remembered === null) return null;
  const id = nodeId(remembered);
  return resultNodes(results).some((node) => nodeId(node) === id) ? id : null;
}

/** Fresh batch: first channel card, else the selected channel's first airing row. */
function freshLanding(results: SearchResults, selectedChannelId: number | null): string | null {
  const firstCard = results.channels[0];
  if (firstCard !== undefined) return channelCardId(firstCard.channel.id);
  const selected =
    results.programs.find((group) => group.channel.id === selectedChannelId) ?? results.programs[0];
  const firstAiring = selected?.airings[0];
  return firstAiring === undefined ? null : airingRowId(firstAiring.channel.id, firstAiring.program.startMs);
}
