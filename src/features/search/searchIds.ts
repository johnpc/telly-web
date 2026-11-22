// Focus ids of the search screen's nodes: stable across re-renders so the
// focus engine's memory, the `data-focus-*` overrides and the acceptance
// steps all address the same node.
import type { SearchProgramAction } from './searchOverlay';

export const SEARCH_IDS = {
  orb: 'search-orb',
  query: 'search-query',
  gear: 'search-gear',
  trash: 'search-trash',
} as const;

export const channelCardId = (channelId: number): string => `search-channel-${channelId}`;
export const masterCardId = (channelId: number): string => `search-master-${channelId}`;
export const airingRowId = (channelId: number, startMs: number): string =>
  `search-airing-${channelId}-${startMs}`;
export const historyRowId = (index: number): string => `search-history-${index}`;
export const menuRowId = (action: SearchProgramAction): string =>
  `search-menu-${action.toLowerCase().replace(/\s+/g, '-')}`;
