import type { Direction } from '@/core/input/remoteKeys';

/**
 * Inline-edit state of a wizard row (port of Android `WizardScreenEditState`):
 * the row turns into an editor on OK; closing it hands focus back to the row
 * (BACK), on to Next (OK commit, reference screen 10), or nowhere (the user
 * already moved focus elsewhere). Pure transitions; `useWizardEditor` applies them.
 */
export type EditPhase =
  { kind: 'Idle' } | { kind: 'Editing' } | { kind: 'Closed'; focus: 'row' | 'next' | 'none' };

export const EDIT_IDLE: EditPhase = { kind: 'Idle' };

export function openEdit(): EditPhase {
  return { kind: 'Editing' };
}

export function commitEdit(canFocusNext: boolean): EditPhase {
  return { kind: 'Closed', focus: canFocusNext ? 'next' : 'row' };
}

export function cancelEdit(): EditPhase {
  return { kind: 'Closed', focus: 'row' };
}

/** Focus left the field by other means: close without stealing focus back. */
export function blurEdit(phase: EditPhase): EditPhase {
  return phase.kind === 'Editing' ? { kind: 'Closed', focus: 'none' } : phase;
}

export interface EditorIds {
  row: string;
  editor: string;
  next: string;
}

/** The element to focus after `phase` was entered, or null to leave focus alone. */
export function editorFocusTarget(phase: EditPhase, ids: EditorIds): string | null {
  if (phase.kind === 'Editing') return ids.editor;
  if (phase.kind !== 'Closed' || phase.focus === 'none') return null;
  return phase.focus === 'row' ? ids.row : ids.next;
}

/** Caret movement inside the editor: the key bridge swallows arrows, so the editor moves it itself. */
export function moveCaret(input: HTMLInputElement, direction: Direction): boolean {
  if (direction !== 'LEFT' && direction !== 'RIGHT') return false;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const collapsed = start === end;
  const next = direction === 'LEFT' ? (collapsed ? start - 1 : start) : collapsed ? end + 1 : end;
  const position = Math.max(0, Math.min(input.value.length, next));
  input.setSelectionRange(position, position);
  return true;
}
