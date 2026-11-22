import type { PlayerMenuItem } from './playerMenu';

/** Where a long-OK context-sheet row leads (Android `PlayerMenuRoute`). */
export type PlayerMenuRoute =
  | 'Search'
  | 'Settings'
  | 'ToggleFavorite'
  | 'HideChannel'
  | 'ToggleBlock'
  | 'Description'
  | 'ExternalPlayer'
  | 'ManageFavorites'
  | 'ReorderChannels'
  /** Slices not yet ported on the web (recording, My list, channel options, group tools). */
  | 'ComingSoon';

const ROUTES: Readonly<Record<PlayerMenuItem, PlayerMenuRoute>> = {
  Search: 'Search',
  Settings: 'Settings',
  'Open in external player': 'ExternalPlayer',
  Record: 'ComingSoon',
  'Custom recording': 'ComingSoon',
  'Add to My list': 'ComingSoon',
  'Program description': 'Description',
  'Add to Favorites': 'ToggleFavorite',
  'Block channel': 'ToggleBlock',
  'Hide channel': 'HideChannel',
  'Assign EPG': 'ComingSoon',
  'Channel options': 'ComingSoon',
  'Manage Favorites': 'ManageFavorites',
  'Manage blocking': 'ComingSoon',
  'Manage visibility': 'ComingSoon',
  'Reorder channels': 'ReorderChannels',
  'Copy channels': 'ComingSoon',
  'Create group': 'ComingSoon',
  'Group options': 'ComingSoon',
};

/** The routing table of the shared context sheet, derived ONCE (the guide's sheet consumes it too). */
export function routeOf(item: PlayerMenuItem): PlayerMenuRoute {
  return ROUTES[item];
}

/** Routes that push a screen whose BACK pops back to the sheet. */
const PUSHED: ReadonlySet<PlayerMenuRoute> = new Set(['Description', 'ToggleBlock', 'ComingSoon']);

/**
 * Focus memory of the sheet: a row that pushes a screen over the sheet
 * remembers itself so BACK re-lands sheet focus on it instead of resetting
 * to the first row (Android `PlayerMenuFocus`).
 */
export class PlayerMenuFocus {
  private item: PlayerMenuItem | null = null;

  /** The row the reopened sheet should focus; null = the first row. */
  get restore(): PlayerMenuItem | null {
    return this.item;
  }

  onActivated(item: PlayerMenuItem): void {
    this.item = PUSHED.has(routeOf(item)) ? item : null;
  }

  clear(): void {
    this.item = null;
  }
}
