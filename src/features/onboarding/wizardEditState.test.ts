import { describe, expect, it } from 'vitest';
import {
  EDIT_IDLE,
  blurEdit,
  cancelEdit,
  commitEdit,
  editorFocusTarget,
  moveCaret,
  openEdit,
} from './wizardEditState';

const ids = { row: 'row', editor: 'row-editor', next: 'next' };

describe('wizardEditState', () => {
  it('opening focuses the editor, commit hands focus to Next (or the row), cancel back to the row', () => {
    expect(editorFocusTarget(EDIT_IDLE, ids)).toBeNull();
    expect(editorFocusTarget(openEdit(), ids)).toBe('row-editor');
    expect(editorFocusTarget(commitEdit(true), ids)).toBe('next');
    expect(editorFocusTarget(commitEdit(false), ids)).toBe('row');
    expect(editorFocusTarget(cancelEdit(), ids)).toBe('row');
  });
  it('a blur closes an open editor without stealing focus and leaves other phases alone', () => {
    expect(blurEdit(openEdit())).toEqual({ kind: 'Closed', focus: 'none' });
    expect(editorFocusTarget(blurEdit(openEdit()), ids)).toBeNull();
    const committed = commitEdit(true);
    expect(blurEdit(committed)).toBe(committed);
    expect(blurEdit(EDIT_IDLE)).toBe(EDIT_IDLE);
  });
  it('moves the caret left/right, collapsing a selection first, clamped to the value', () => {
    const input = document.createElement('input');
    input.value = 'abcd';
    document.body.append(input);
    input.setSelectionRange(0, 4);
    expect(moveCaret(input, 'RIGHT')).toBe(true);
    expect([input.selectionStart, input.selectionEnd]).toEqual([4, 4]);
    expect(moveCaret(input, 'RIGHT')).toBe(true);
    expect(input.selectionStart).toBe(4);
    moveCaret(input, 'LEFT');
    expect(input.selectionStart).toBe(3);
    input.setSelectionRange(1, 3);
    moveCaret(input, 'LEFT');
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 1]);
    input.setSelectionRange(0, 0);
    moveCaret(input, 'LEFT');
    expect(input.selectionStart).toBe(0);
    expect(moveCaret(input, 'UP')).toBe(false);
    input.remove();
  });
});
