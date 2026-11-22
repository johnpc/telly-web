import { useMemo, useReducer } from 'react';
import type { ParentalControls } from '@/core/settings/parentalControls';
import {
  type PanelFocusState,
  initialPanelFocus,
  openFocusedOn,
  pinDismissed,
  pinVerified,
  rowFocused,
  selectGroup,
} from './panelFocus';

export interface PanelFocusActions {
  selectGroup(group: string, locked: boolean): void;
  rowFocused(index: number): void;
  /** Verifies the PIN against parental controls; a wrong PIN keeps prompting. */
  submitPin(pin: string): Promise<void>;
  dismissPin(): void;
}

export interface PanelFocusApi extends PanelFocusActions {
  state: PanelFocusState;
}

type PanelAction =
  | { kind: 'select'; group: string; locked: boolean }
  | { kind: 'row'; index: number }
  | { kind: 'verified' }
  | { kind: 'dismiss' };

function reduce(state: PanelFocusState, action: PanelAction): PanelFocusState {
  switch (action.kind) {
    case 'select':
      return selectGroup(state, action.group, action.locked);
    case 'row':
      return rowFocused(state, action.index);
    case 'verified':
      return pinVerified(state);
    case 'dismiss':
      return pinDismissed(state);
  }
}

function start(openIndex: number): PanelFocusState {
  return openFocusedOn(initialPanelFocus(), openIndex, openIndex);
}

function actionsOf(dispatch: (action: PanelAction) => void, parental: ParentalControls): PanelFocusActions {
  return {
    selectGroup: (group, locked) => dispatch({ kind: 'select', group, locked }),
    rowFocused: (index) => dispatch({ kind: 'row', index }),
    submitPin: async (pin) => {
      if (await parental.verifyPin(pin)) dispatch({ kind: 'verified' });
    },
    dismissPin: () => dispatch({ kind: 'dismiss' }),
  };
}

/**
 * Owns the panel's focus state machine (`panelFocus.ts`) for the component's
 * lifetime. The panel opens focused on `openIndex` (the tuned channel's row
 * in All channels; -1 = first row).
 */
export function usePanelFocus(parental: ParentalControls, openIndex: number): PanelFocusApi {
  const [state, dispatch] = useReducer(reduce, openIndex, start);
  const actions = useMemo(() => actionsOf(dispatch, parental), [parental]);
  return { state, ...actions };
}
