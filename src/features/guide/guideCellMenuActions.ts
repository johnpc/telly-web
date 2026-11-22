import type { ChannelRow, ProgramRow } from '@/core/db/types';
import type { GuideMenuController } from './guideMenuController';
import type { GuideCellAction, GuideRow } from './guideModel';

/** The cross-slice seams the dropdown rows act through. */
export interface CellActionDeps {
  menu: GuideMenuController;
  focusedRow: () => GuideRow | undefined;
  playChannel: (channel: ChannelRow) => void;
  toggleReminder: (channel: ChannelRow, program: ProgramRow) => void;
  toggleMyList: (channel: ChannelRow, program: ProgramRow) => void;
}

type Toggle = (channel: ChannelRow, program: ProgramRow) => void;

function playFocused(deps: CellActionDeps): void {
  const row = deps.focusedRow();
  deps.menu.reset();
  if (row !== undefined) deps.playChannel(row.channel);
}

/** True when the focused cell held a real programme to toggle. */
function toggleFocused(deps: CellActionDeps, toggle: Toggle): boolean {
  const layer = deps.menu.layer;
  const program = layer.kind === 'CellMenu' ? layer.cell.program : null;
  const row = deps.focusedRow();
  if (program === null || row === undefined) return false;
  toggle(row.channel, program);
  deps.menu.reset();
  return true;
}

function toggleFor(deps: CellActionDeps, action: GuideCellAction): Toggle | null {
  if (action === 'Remind') return deps.toggleReminder;
  return action === 'Add to My list' ? deps.toggleMyList : null;
}

/**
 * The long-OK cell dropdown's row dispatch (Android `onCellAction`): Play
 * channel tunes + goes fullscreen, Remind toggles a reminder, "Add to My
 * list" toggles the cell's programme; every other row (Record, Custom
 * recording, Program description) opens the branded coming-soon placeholder.
 */
export function onCellAction(deps: CellActionDeps, action: GuideCellAction): void {
  if (action === 'Play channel') return playFocused(deps);
  const toggle = toggleFor(deps, action);
  if (toggle === null || !toggleFocused(deps, toggle)) deps.menu.comingSoon(action);
}
