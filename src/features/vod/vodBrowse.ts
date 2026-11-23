import type { VodItemRow, VodPositionRow } from '@/core/db/types';
import { groupIdOf } from '@/features/panel/panelKeys';
import { vodPermille } from './vodStage';

/** One browser card: the item plus its stored progress ("Continue watching"). */
export interface VodCard {
  item: VodItemRow;
  progressPermille: number | null;
}

/**
 * Pure shaping for the Movies browser (Android `VodBrowse`): categories are
 * the items' preserved group-titles in playlist order (blank/missing group
 * -> UNCATEGORIZED), cards are the selected category's items joined with
 * stored positions.
 */
export const UNCATEGORIZED = 'Uncategorized';

export function categoryOf(item: VodItemRow): string {
  const group = item.groupTitle?.trim() ?? '';
  return group === '' ? UNCATEGORIZED : group;
}

export function categories(items: readonly VodItemRow[]): string[] {
  return [...new Set(items.map(categoryOf))];
}

/** The active category: the user's choice while it still exists, else the first one. */
export function selectedCategory(chosen: string | null, all: readonly string[]): string | null {
  return chosen !== null && all.includes(chosen) ? chosen : (all[0] ?? null);
}

export function cards(
  items: readonly VodItemRow[],
  category: string | null,
  positions: readonly VodPositionRow[],
): VodCard[] {
  const byKey = new Map(positions.map((position) => [position.itemKey, position]));
  return items
    .filter((item) => category === null || categoryOf(item) === category)
    .map((item) => ({ item, progressPermille: progressOf(byKey.get(item.itemKey)) }));
}

function progressOf(position: VodPositionRow | undefined): number | null {
  if (position === undefined || position.durationMs <= 0) return null;
  return vodPermille(position.positionMs, position.durationMs);
}

const CARD_PREFIX = 'vod-card-';
const GROUP_PREFIX = groupIdOf('');

export function cardFocusId(itemKey: string): string {
  return `${CARD_PREFIX}${itemKey}`;
}

/** True for a focus id inside the Movies browser (a category row or a card). */
export function inVodBrowser(focusId: string | null): boolean {
  return focusId !== null && (focusId.startsWith(CARD_PREFIX) || focusId.startsWith(GROUP_PREFIX));
}

/** The browser's derived view (Android `VodViewModel`'s flows) for one read of the tables. */
export interface VodBrowserView {
  categories: string[];
  selected: string | null;
  cards: VodCard[];
  /** True once the playlist import produced no VOD items at all (false while still reading). */
  empty: boolean;
}

/** The two live tables as read so far (undefined = still reading). */
export interface VodTables {
  items: readonly VodItemRow[] | undefined;
  positions: readonly VodPositionRow[] | undefined;
}

export function browserView({ items, positions }: VodTables, chosen: string | null): VodBrowserView {
  const all = categories(items ?? []);
  const selected = selectedCategory(chosen, all);
  return {
    categories: all,
    selected,
    cards: cards(items ?? [], selected, positions ?? []),
    empty: items !== undefined && items.length === 0,
  };
}
