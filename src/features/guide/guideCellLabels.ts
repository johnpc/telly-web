import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { MY_LIST_REMOVE_LABEL, type SheetFlags } from '@/features/channelmenu/sheetMenu';
import { isSavedInMyList } from '@/features/mylist/myListToggle';
import type { GuideCell, GuideCellAction, GuideFocus, GuideRow } from './guideModel';
import { reminderKey } from './guideSeams';

export const REMIND_REMOVE_LABEL = 'Remove reminder';

/** The live state the dropdown labels flip on. */
export interface CellLabelState {
  channel: ChannelRow | undefined;
  program: ProgramRow | null;
  myList: ReadonlySet<string>;
  reminders: ReadonlySet<string>;
}

/** "Remind" → "Remove reminder" while one is set; "Add to My list" → "Remove from My list" while saved. */
export function cellActionLabel(action: GuideCellAction, state: CellLabelState): string {
  const { channel, program } = state;
  if (channel === undefined || program === null) return action;
  if (action === 'Remind' && state.reminders.has(reminderKey(channel.id, program.startMs, program.title))) {
    return REMIND_REMOVE_LABEL;
  }
  if (action === 'Add to My list' && isSavedInMyList(state.myList, channel, program.startMs)) {
    return MY_LIST_REMOVE_LABEL;
  }
  return action;
}

/** The state the sheet's flipping rows read: favorite, saved-programme, blocked. */
export function sheetFlagsFor(
  channel: ChannelRow,
  program: ProgramRow | null,
  myList: ReadonlySet<string>,
): SheetFlags {
  return {
    favorite: channel.favorite,
    inMyList: isSavedInMyList(myList, channel, program?.startMs ?? null),
    blocked: channel.blocked,
  };
}

/** The row + cell the open sheet belongs to; null unless a row is focused. */
export function sheetTarget(
  focus: GuideFocus | null,
  rows: readonly GuideRow[],
): { row: GuideRow; cell: GuideCell } | null {
  const row = focus === null ? undefined : rows[focus.rowIndex];
  return focus === null || row === undefined ? null : { row, cell: focus.cell };
}
