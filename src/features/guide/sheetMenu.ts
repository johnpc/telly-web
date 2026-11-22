import { NO_INFORMATION } from './guideModel';

/** Verbatim TiviMate context-menu rows (Android `PlayerMenuItem`). */
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

/** The full long-OK sheet on a guide row (round3-ref 05). */
export function sheetSections(programTitle: string | null, channelName: string): SheetSection[] {
  return [
    { header: null, items: TOP },
    { header: programTitle ?? NO_INFORMATION, items: PROGRAMME },
    { header: channelName, items: CHANNEL },
    { header: 'All channels', items: ALL_CHANNELS_ITEMS },
  ];
}

export interface SheetFlags {
  favorite: boolean;
  inMyList: boolean;
  blocked: boolean;
}

export const MY_LIST_REMOVE_LABEL = 'Remove from My list';

/** Rows whose label flips with the channel/programme state. */
export function sheetLabel(item: SheetItem, flags: SheetFlags): string {
  if (item === 'Add to Favorites' && flags.favorite) return 'Remove from Favorites';
  if (item === 'Add to My list' && flags.inMyList) return MY_LIST_REMOVE_LABEL;
  if (item === 'Block channel' && flags.blocked) return 'Unblock channel';
  return item;
}

/** The six rows served by the group/bulk tool sessions. */
export const GROUP_TOOL_ITEMS: ReadonlySet<SheetItem> = new Set<SheetItem>([
  'Create group',
  'Group options',
  'Copy channels',
  'Assign EPG',
  'Manage blocking',
  'Manage visibility',
]);
