import type { ChannelRow, ProgramRow } from '@/core/db/types';

/** One programme cell of the grid; a null `program` is a "No information" filler (Android `GuideCell`). */
export interface GuideCell {
  startMs: number;
  endMs: number;
  program: ProgramRow | null;
}

export function cellContains(cell: GuideCell, atMs: number): boolean {
  return atMs >= cell.startMs && atMs < cell.endMs;
}

export function hasInfo(cell: GuideCell): boolean {
  return cell.program !== null;
}

/** One channel row: playlist number in "All channels", renumbered from 1 inside a group. */
export interface GuideRow {
  channel: ChannelRow;
  displayNumber: number;
  cells: GuideCell[];
}

/** The focused cell plus the time anchor UP/DOWN try to keep constant. */
export interface GuideFocus {
  rowIndex: number;
  cell: GuideCell;
  anchorMs: number;
}

/** TiviMate's placeholder for EPG-less cells and channels. */
export const NO_INFORMATION = 'No information';

/** The rows of the long-OK cell dropdown, in capture order ("Play channel" leads). */
export const GUIDE_CELL_ACTIONS = [
  'Play channel',
  'Remind',
  'Record',
  'Custom recording',
  'Add to My list',
  'Program description',
] as const;

export type GuideCellAction = (typeof GUIDE_CELL_ACTIONS)[number];

/** Copy of the branded placeholder's subtitle (Android `playback_coming_soon`). */
export const COMING_SOON = 'Coming soon to telly';
