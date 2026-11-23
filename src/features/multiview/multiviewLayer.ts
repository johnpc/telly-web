// Which layer covers the multiview grid (spec: panes -> menu -> picker), plus
// the PIN card the tune gate raises over any of them. ONE owner:
// `MultiviewViewModel` is the sole writer (Android `MultiviewLayer`).
// @stateMachine('Multiview')

/** What a picker selection does: fill the next pane or retune the focused one. */
export type MultiviewPickerMode = 'ADD' | 'CHANGE';

export type MultiviewLayer =
  /** The bare pane grid (single pane = the captured teaser framing). */
  | { kind: 'Panes' }
  /** OK on a pane: Add screen / Search and add / Change channel [/ Remove screen]. */
  | { kind: 'Menu' }
  /** The channel picker every menu row opens. */
  | { kind: 'Picker'; mode: MultiviewPickerMode };

export const PANES: MultiviewLayer = { kind: 'Panes' };
export const MENU: MultiviewLayer = { kind: 'Menu' };

export function picker(mode: MultiviewPickerMode): MultiviewLayer {
  return { kind: 'Picker', mode };
}

/** Pane-menu rows, captured order + telly's Remove. */
export type MultiviewMenuAction = 'ADD_SCREEN' | 'SEARCH_AND_ADD' | 'CHANGE_CHANNEL' | 'REMOVE_SCREEN';

export const MENU_LABELS: Readonly<Record<MultiviewMenuAction, string>> = {
  ADD_SCREEN: 'Add screen',
  SEARCH_AND_ADD: 'Search and add',
  CHANGE_CHANNEL: 'Change channel',
  REMOVE_SCREEN: 'Remove screen',
};

const ALL_ACTIONS: readonly MultiviewMenuAction[] = [
  'ADD_SCREEN',
  'SEARCH_AND_ADD',
  'CHANGE_CHANNEL',
  'REMOVE_SCREEN',
];

/**
 * Remove screen only exists while the grid has panes to spare (>1), and the
 * two add rows leave at the `maxPanes` cap (a no-op "Add screen" at four
 * panes was the logged delta).
 */
export function menuRows(paneCount: number, maxPanes: number): MultiviewMenuAction[] {
  return ALL_ACTIONS.filter((action) => {
    if (action === 'REMOVE_SCREEN') return paneCount > 1;
    if (action === 'CHANGE_CHANNEL') return true;
    return paneCount < maxPanes;
  });
}
