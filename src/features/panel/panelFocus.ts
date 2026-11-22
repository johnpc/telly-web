// Channel-panel focus state (port of Android `PanelViewModel`): which group
// is selected, which row is focused, the per-group focus memory, the
// parental gate on locked groups, and the versioned focus command the row
// list executes on EVERY version (so reopening on the tuned row lands there
// even when the D-pad had moved on). Pure transitions; the hook owns the
// instance.
// @stateMachine('Panel focus')
import { ALL_CHANNELS } from './panelGroups';

/** A focus move the row list must execute: scroll to + focus `index`. */
export interface FocusCommand {
  version: number;
  index: number;
}

export type PanelMode =
  | { kind: 'Browsing'; group: string; row: number }
  /** A locked group was picked: the PIN prompt is up, `pending` awaits the verified PIN. */
  | { kind: 'PinPrompt'; group: string; row: number; pending: string };

export interface PanelFocusState {
  mode: PanelMode;
  memory: ReadonlyMap<string, number>;
  command: FocusCommand;
}

export function initialPanelFocus(group: string = ALL_CHANNELS): PanelFocusState {
  return { mode: { kind: 'Browsing', group, row: 0 }, memory: new Map(), command: { version: 0, index: 0 } };
}

/** True when `index` is already the focused AND remembered row (a no-op focus report). */
function isFocused(state: PanelFocusState, index: number): boolean {
  return state.mode.row === index && state.memory.get(state.mode.group) === index;
}

/** A row took focus (D-pad or command): remember it for its group. */
export function rowFocused(state: PanelFocusState, index: number): PanelFocusState {
  if (isFocused(state, index)) return state;
  const memory = new Map(state.memory).set(state.mode.group, index);
  return { ...state, mode: { ...state.mode, row: index }, memory };
}

function commandFocus(state: PanelFocusState, index: number): PanelFocusState {
  const next = rowFocused(state, index);
  return { ...next, command: { version: state.command.version + 1, index } };
}

function applyGroup(state: PanelFocusState, group: string): PanelFocusState {
  const browsing: PanelFocusState = { ...state, mode: { kind: 'Browsing', group, row: state.mode.row } };
  return commandFocus(browsing, state.memory.get(group) ?? 0);
}

/** OK on a group row; a locked group prompts for the PIN instead of switching. */
export function selectGroup(state: PanelFocusState, group: string, locked: boolean): PanelFocusState {
  if (group === state.mode.group) return state;
  if (!locked) return applyGroup(state, group);
  return {
    ...state,
    mode: { kind: 'PinPrompt', group: state.mode.group, row: state.mode.row, pending: group },
  };
}

/** The verified PIN releases the pending locked group. */
export function pinVerified(state: PanelFocusState): PanelFocusState {
  return state.mode.kind === 'PinPrompt' ? applyGroup(state, state.mode.pending) : state;
}

/** BACK on the prompt keeps the previous group. */
export function pinDismissed(state: PanelFocusState): PanelFocusState {
  const { group, row } = state.mode;
  return { ...state, mode: { kind: 'Browsing', group, row } };
}

/**
 * Panel opened on a channel (the tuned one): focus it inside the selected
 * group, or fall back to All channels when the group does not list it.
 */
export function openFocusedOn(
  state: PanelFocusState,
  indexInGroup: number,
  indexInAll: number,
): PanelFocusState {
  if (indexInGroup >= 0) return commandFocus(state, indexInGroup);
  const all: PanelFocusState = {
    ...state,
    mode: { kind: 'Browsing', group: ALL_CHANNELS, row: state.mode.row },
  };
  return commandFocus(all, Math.max(0, indexInAll));
}
