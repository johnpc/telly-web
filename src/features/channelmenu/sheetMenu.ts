/**
 * Verbatim TiviMate 5.2.0 context-menu rows (captures 38-40 + round3-ref 05):
 * long-OK on a panel row or MENU on a guide row, the host still visible
 * behind. ONE definition for both hosts (Android `PlayerMenuItem` +
 * `PlayerMenu`); where each row leads is derived once in `menuRouting.ts`.
 */
export const SHEET_ITEMS = [
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

export type SheetItem = (typeof SHEET_ITEMS)[number];

/** One blue-headed section of the menu sheet; a null header renders no strip. */
export interface SheetSection {
  header: string | null;
  items: readonly SheetItem[];
}

/** TiviMate's placeholder for EPG-less cells, channels and the description screen. */
export const NO_INFORMATION = 'No information';

/** Copy of the branded placeholder's subtitle (Android `playback_coming_soon`). */
export const COMING_SOON = 'Coming soon to telly';

const TOP: readonly SheetItem[] = ['Search', 'Settings'];
const PROGRAMME: readonly SheetItem[] = [
  'Open in external player',
  'Record',
  'Custom recording',
  'Add to My list',
  'Program description',
];
const CHANNEL: readonly SheetItem[] = [
  'Add to Favorites',
  'Block channel',
  'Hide channel',
  'Assign EPG',
  'Channel options',
];
const ALL_CHANNELS_ITEMS: readonly SheetItem[] = [
  'Manage Favorites',
  'Manage blocking',
  'Manage visibility',
  'Reorder channels',
  'Copy channels',
  'Create group',
  'Group options',
];

/** The full sheet on a panel/guide row (round3-ref 05). */
export function sheetSections(programTitle: string | null, channelName: string): SheetSection[] {
  return [
    { header: null, items: TOP },
    { header: programTitle ?? NO_INFORMATION, items: PROGRAMME },
    { header: channelName, items: CHANNEL },
    { header: 'All channels', items: ALL_CHANNELS_ITEMS },
  ];
}

/** The live state the sheet's flipping rows read. */
export interface SheetFlags {
  favorite: boolean;
  inMyList: boolean;
  blocked: boolean;
}

export const MY_LIST_REMOVE_LABEL = 'Remove from My list';

/** A sheet row's focus id: the host's prefix + the item with dashes (hosts key focus policies off the prefix). */
export function sheetRowId(focusPrefix: string, item: SheetItem): string {
  return `${focusPrefix}${item.replaceAll(' ', '-')}`;
}

/** Rows whose label flips with the channel/programme state (Android `PlayerMenuItem.labelFor`). */
export function sheetLabel(item: SheetItem, flags: SheetFlags): string {
  if (item === 'Add to Favorites' && flags.favorite) return 'Remove from Favorites';
  if (item === 'Add to My list' && flags.inMyList) return MY_LIST_REMOVE_LABEL;
  if (item === 'Block channel' && flags.blocked) return 'Unblock channel';
  return item;
}
