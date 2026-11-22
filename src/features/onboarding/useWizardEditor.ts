import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { focusEngine, type FocusEngine } from '@/core/focus/focusEngine';
import { isDirection, type RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import {
  EDIT_IDLE,
  type EditPhase,
  type EditorIds,
  blurEdit,
  cancelEdit,
  commitEdit,
  editorFocusTarget,
  moveCaret,
  openEdit,
} from './wizardEditState';

export interface WizardEditor {
  editing: boolean;
  ids: EditorIds;
  open: () => void;
  commit: () => void;
  cancel: () => void;
  blur: () => void;
}

/** The on-screen keyboard owns the keys while editing: OK commits, BACK cancels, arrows move the caret. */
function editingKeyHandler(commit: () => void, cancel: () => void): (key: RemoteKey) => boolean {
  return (key) => {
    if (key === 'OK') commit();
    else if (key === 'BACK') cancel();
    else if (!isDirection(key)) return false;
    else if (document.activeElement instanceof HTMLInputElement) moveCaret(document.activeElement, key);
    return true;
  };
}

/**
 * Inline-edit state for one wizard row (Android `rememberWizardScreenEditState`):
 * OK on the row opens the editor (focused, value selected so typing replaces
 * it); committing hands focus to Next, cancelling back to the row.
 */
export function useWizardEditor(
  rowId: string,
  nextId: string,
  canFocusNext: boolean,
  engine: FocusEngine = focusEngine,
): WizardEditor {
  const [phase, setPhase] = useState<EditPhase>(EDIT_IDLE);
  const ids = useMemo<EditorIds>(
    () => ({ row: rowId, editor: `${rowId}-editor`, next: nextId }),
    [rowId, nextId],
  );
  useLayoutEffect(() => {
    const target = editorFocusTarget(phase, ids);
    if (target !== null) engine.focus(target);
  }, [phase, ids, engine]);
  const open = useCallback(() => setPhase(openEdit()), []);
  const commit = useCallback(() => setPhase(commitEdit(canFocusNext)), [canFocusNext]);
  const cancel = useCallback(() => setPhase(cancelEdit()), []);
  const blur = useCallback(() => setPhase((current) => blurEdit(current)), []);
  const editing = phase.kind === 'Editing';
  useKeyHandler(
    useMemo(() => editingKeyHandler(commit, cancel), [commit, cancel]),
    editing,
  );
  return { editing, ids, open, commit, cancel, blur };
}
