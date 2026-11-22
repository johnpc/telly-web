/**
 * Verbatim TiviMate 5.2.0 context-menu rows (captures 38-40 + round3-ref 05:
 * long-OK on a panel/guide row, the panel still visible behind). Where each
 * row leads is derived once in `playerMenuRouting.ts` (Android `PlayerMenu`).
 */
export const PLAYER_MENU_ITEMS = [
  'Search',
  'Settings',
  'Open in external player',
  'Record',
  'Custom recording',
  'Add to My list',
  'Program description',
  'Add to Favorites',
  'Block channel',
  'Hide channel',
  'Assign EPG',
  'Channel options',
  'Manage Favorites',
  'Manage blocking',
  'Manage visibility',
  'Reorder channels',
  'Copy channels',
  'Create group',
  'Group options',
] as const;

export type PlayerMenuItem = (typeof PLAYER_MENU_ITEMS)[number];

/** One blue-headed section of the menu sheet; a null header renders no strip. */
export interface PlayerMenuSection {
  header: string | null;
  items: readonly PlayerMenuItem[];
}

/** EPG-gap fallback for the programme header and description screen. */
export const NO_INFORMATION = 'No information';

const TOP_ITEMS: readonly PlayerMenuItem[] = ['Search', 'Settings'];
const PROGRAM_ITEMS: readonly PlayerMenuItem[] = [
  'Open in external player',
  'Record',
  'Custom recording',
  'Add to My list',
  'Program description',
];
const CHANNEL_ITEMS: readonly PlayerMenuItem[] = [
  'Add to Favorites',
  'Block channel',
  'Hide channel',
  'Assign EPG',
  'Channel options',
];
const ALL_CHANNELS_ITEMS: readonly PlayerMenuItem[] = [
  'Manage Favorites',
  'Manage blocking',
  'Manage visibility',
  'Reorder channels',
  'Copy channels',
  'Create group',
  'Group options',
];

/** The full long-OK sheet on a panel/guide row (round3-ref 05). */
export function menuSections(programTitle: string | null, channelName: string): PlayerMenuSection[] {
  return [
    { header: null, items: TOP_ITEMS },
    { header: programTitle ?? NO_INFORMATION, items: PROGRAM_ITEMS },
    { header: channelName, items: CHANNEL_ITEMS },
    { header: 'All channels', items: ALL_CHANNELS_ITEMS },
  ];
}

export interface MenuLabelState {
  favorite: boolean;
  blocked: boolean;
}

/** "Add to Favorites" flips on a favorite; "Block channel" flips on a blocked channel. */
export function menuLabel(item: PlayerMenuItem, state: MenuLabelState): string {
  if (item === 'Add to Favorites' && state.favorite) return 'Remove from Favorites';
  if (item === 'Block channel' && state.blocked) return 'Unblock channel';
  return item;
}
