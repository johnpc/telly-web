import type { ChannelRow, ProgramRow } from '@/core/db/types';
import type { GuideRecording } from '@/features/recording';
import type { GuideMenuController } from './guideMenuController';
import type { GuideCellAction, GuideRow } from './guideModel';

/** The cross-slice seams the dropdown rows act through. */
export interface CellActionDeps {
  menu: GuideMenuController;
  focusedRow: () => GuideRow | undefined;
  playChannel: (channel: ChannelRow) => void;
  toggleReminder: (channel: ChannelRow, program: ProgramRow) => void;
  toggleMyList: (channel: ChannelRow, program: ProgramRow) => void;
  /** Record schedules the focused cell's slot (instant when airing); Custom recording opens the form. Absent (tests): placeholder. */
  recording?: Pick<GuideRecording, 'recordCell' | 'customRecording'>;
  now?: () => number;
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
 * list" toggles the cell's programme, Record / Custom recording act through
 * the DVR adapter; Program description opens the branded coming-soon placeholder.
 */
export function onCellAction(deps: CellActionDeps, action: GuideCellAction): void {
  if (action === 'Play channel') return playFocused(deps);
  if (action === 'Record' || action === 'Custom recording') return recordFocused(deps, action);
  const toggle = toggleFor(deps, action);
  if (toggle === null || !toggleFocused(deps, toggle)) deps.menu.comingSoon(action);
}

/** The DVR rows on the focused cell; a vanished row falls back to the placeholder. */
function recordFocused(deps: CellActionDeps, action: 'Record' | 'Custom recording'): void {
  const layer = deps.menu.layer;
  const row = deps.focusedRow();
  const recording = deps.recording;
  if (layer.kind !== 'CellMenu' || row === undefined || recording === undefined) {
    return deps.menu.comingSoon(action);
  }
  if (action === 'Record') recording.recordCell(row.channel, layer.cell, (deps.now ?? Date.now)());
  else recording.customRecording(row.channel);
}
