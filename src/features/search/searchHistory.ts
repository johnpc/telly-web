// The landing screen's "Search history" list (port of Android `SearchHistory`):
// committed queries, most recent first, case-insensitively deduplicated and
// capped, persisted newline-joined in the key-value store.
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { normalizeQuery } from './searchQuery';

export const SEARCH_HISTORY_KEY = 'search.history';
export const SEARCH_HISTORY_MAX = 20;
const SEPARATOR = '\n';

export function parseHistory(serialized: string): string[] {
  return serialized.split(SEPARATOR).filter((entry) => entry.trim() !== '');
}

export class SearchHistory {
  constructor(
    private readonly store: KeyValueStore,
    /** Settings -> Other -> Search "Save search history"; off = no recording. */
    private readonly saveEnabled: () => boolean = () => true,
  ) {}

  /** The persisted list as stored (a stable string snapshot for React). */
  serialized(): string {
    return this.store.get(SEARCH_HISTORY_KEY) ?? '';
  }

  list(): string[] {
    return parseHistory(this.serialized());
  }

  /** Records a committed query; re-searching moves it back to the front. */
  record(raw: string): void {
    if (!this.saveEnabled()) return;
    const query = normalizeQuery(raw);
    if (query === '') return;
    const rest = this.list().filter((entry) => entry.toLowerCase() !== query.toLowerCase());
    this.store.set(SEARCH_HISTORY_KEY, [query, ...rest].slice(0, SEARCH_HISTORY_MAX).join(SEPARATOR));
  }

  /** The header's trash icon and Settings -> Other -> Search -> Clear search history. */
  clear(): void {
    this.store.remove(SEARCH_HISTORY_KEY);
  }

  /** Fires after every change (the landing list re-reads). */
  readonly subscribe = (listener: () => void): (() => void) =>
    this.store.subscribe(SEARCH_HISTORY_KEY, () => listener());
}
