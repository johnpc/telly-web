import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { focusEngine, type FocusEngine } from '@/core/focus/focusEngine';
import {
  browserView,
  cardFocusId,
  inVodBrowser,
  type VodBrowserView,
  type VodCard,
  type VodTables,
} from './vodBrowse';
import { defaultVodDeps, type VodDeps } from './vodDeps';

/** The Movies browser's state (Android `VodViewModel`): categories left, the selected category's cards right. */
export interface VodBrowser extends VodBrowserView {
  select(category: string): void;
}

/** The vod_items / vod_positions tables as live reads (the Room `Flow` equivalent). */
function useVodTables(deps: VodDeps): VodTables {
  return {
    items: useLiveQuery(() => deps.items.items(), [deps]),
    positions: useLiveQuery(() => deps.positions.positions(), [deps]),
  };
}

export function useVodBrowser(deps: VodDeps = defaultVodDeps): VodBrowser {
  const tables = useVodTables(deps);
  const [chosen, select] = useState<string | null>(null);
  return { ...browserView(tables, chosen), select };
}

/** The cards' focus ids, in grid order. */
export function cardIds(list: readonly VodCard[]): string[] {
  return list.map((card) => cardFocusId(card.item.itemKey));
}

/**
 * Focus-on-appear for the card grid (Android `focusOnAppear(index == 0)`
 * + `rememberFocusSeed`): the first card takes focus once the grid has
 * cards, unless focus already sits in the browser — a category switch
 * re-keys the cards and must not yank focus off the categories column.
 */
export function useFocusFirstCard(ids: readonly string[], engine: FocusEngine = focusEngine): void {
  const first = ids[0];
  useEffect(() => {
    if (first !== undefined && !inVodBrowser(engine.current)) engine.focus(first);
  }, [first, engine]);
}
