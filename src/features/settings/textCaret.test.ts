import { describe, expect, it } from 'vitest';
import { type CaretField, moveCaret } from './textCaret';

function field(value: string, selectionStart: number | null): CaretField & { at: number } {
  const f = {
    value,
    selectionStart,
    at: -1,
    setSelectionRange(start: number) {
      f.at = start;
    },
  };
  return f;
}

describe('moveCaret', () => {
  it('moves by one character and clamps at both ends', () => {
    const f = field('abc', 1);
    expect(moveCaret(f, 'LEFT')).toBe(true);
    expect(f.at).toBe(0);
    moveCaret(field('abc', 0), 'LEFT');
    const r = field('abc', 3);
    moveCaret(r, 'RIGHT');
    expect(r.at).toBe(3);
  });

  it('jumps to the start and end, defaulting to the end when the browser reports no caret', () => {
    const f = field('abcd', null);
    moveCaret(f, 'UP');
    expect(f.at).toBe(0);
    moveCaret(f, 'DOWN');
    expect(f.at).toBe(4);
    moveCaret(f, 'LEFT');
    expect(f.at).toBe(3);
  });
});
