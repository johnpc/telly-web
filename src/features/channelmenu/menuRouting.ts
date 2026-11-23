import type { SheetItem } from './sheetMenu';

/** Where a context-sheet row leads (Android `PlayerMenuRoute`, catalogue §3 38-42). */
export type PlayerMenuRoute =
  | 'Search'
  | 'Settings'
  | 'ToggleFavorite'
  | 'HideChannel'
  | 'ToggleBlock'
  | 'Description'
  | 'ExternalPlayer'
  /** Replaces the sheet with the live §41 "Channel options" pane. */
  | 'ChannelOptions'
  | 'MyListToggle'
  | 'ManageFavorites'
  | 'ReorderChannels'
  /** DVR: instant record (or Stop confirm) / the custom-recording form. */
  | 'Record'
  | 'CustomRecording'
  /** The six group/bulk tool screens. */
  | 'CreateGroup'
  | 'GroupOptions'
  | 'CopyChannels'
  | 'AssignEpg'
  | 'ManageBlocking'
  | 'ManageVisibility';

/** Every sheet row is live: the table is TOTAL (no coming-soon fallback). */
const ROUTES: Readonly<Record<SheetItem, PlayerMenuRoute>> = {
  Search: 'Search',
  Settings: 'Settings',
  'Open in external player': 'ExternalPlayer',
  Record: 'Record',
  'Custom recording': 'CustomRecording',
  'Add to My list': 'MyListToggle',
  'Program description': 'Description',
  'Add to Favorites': 'ToggleFavorite',
  'Block channel': 'ToggleBlock',
  'Hide channel': 'HideChannel',
  'Assign EPG': 'AssignEpg',
  'Channel options': 'ChannelOptions',
  'Manage Favorites': 'ManageFavorites',
  'Manage blocking': 'ManageBlocking',
  'Manage visibility': 'ManageVisibility',
  'Reorder channels': 'ReorderChannels',
  'Copy channels': 'CopyChannels',
  'Create group': 'CreateGroup',
  'Group options': 'GroupOptions',
};

/**
 * The routing table of the shared context sheet, derived ONCE: the guide's
 * sheet and the playback panel's consume it, so the two can never drift
 * (Android `PlayerMenuRouting`).
 */
export function routeOf(item: SheetItem): PlayerMenuRoute {
  return ROUTES[item];
}

/** The six routes `GroupTools` serves. */
export const GROUP_TOOL_ROUTES: ReadonlySet<PlayerMenuRoute> = new Set<PlayerMenuRoute>([
  'CreateGroup',
  'GroupOptions',
  'CopyChannels',
  'AssignEpg',
  'ManageBlocking',
  'ManageVisibility',
]);

/** Routes that push a screen over the sheet whose BACK pops back to it. */
const PUSHED: ReadonlySet<PlayerMenuRoute> = new Set<PlayerMenuRoute>([
  'Description',
  'ToggleBlock',
  'CustomRecording',
  ...GROUP_TOOL_ROUTES,
]);

/**
 * Focus memory of the sheet: a row that pushes a screen over the sheet
 * remembers itself so BACK re-lands sheet focus on it instead of resetting
 * to the first row (Android `PlayerMenuFocus`).
 */
export class PlayerMenuFocus {
  private item: SheetItem | null = null;

  /** The row the reopened sheet should focus; null = the first row. */
  get restore(): SheetItem | null {
    return this.item;
  }

  onActivated(item: SheetItem): void {
    this.item = PUSHED.has(routeOf(item)) ? item : null;
  }

  clear(): void {
    this.item = null;
  }
}
