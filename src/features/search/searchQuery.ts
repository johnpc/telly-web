// Pure query preparation for the search screen (port of Android `SearchQuery`
// + `SearchDao`'s WHERE clauses): whitespace is trimmed and collapsed; channels
// match by name WORD-PREFIX (case-insensitive — "xtra"/"room" find nothing,
// "o" finds "One") or by channel-number prefix, but only when the whole query
// is digits — "2" finds channel 2x, "news 2" never does.
import { titleMatches } from '@/core/db/programRepository';
import type { ChannelRow } from '@/core/db/types';

export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function numberPrefixMatches(number: number, query: string): boolean {
  return /^\d+$/.test(query) && String(number).startsWith(query);
}

/** Matches the PLAYLIST name (a custom name is display-only, as on Android). */
export function channelMatches(channel: Pick<ChannelRow, 'name' | 'number'>, query: string): boolean {
  return titleMatches(channel.name, query) || numberPrefixMatches(channel.number, query);
}

/** `ORDER BY name COLLATE NOCASE, number` (live 5.2.0, tm-02). */
export function byNameThenNumber(
  a: Pick<ChannelRow, 'name' | 'number'>,
  b: Pick<ChannelRow, 'name' | 'number'>,
): number {
  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  if (left !== right) return left < right ? -1 : 1;
  return a.number - b.number;
}
