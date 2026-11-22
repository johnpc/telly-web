import type { Direction } from '@/core/input/remoteKeys';

/** The slice of `HTMLInputElement` caret movement touches; tests pass plain objects. */
export type CaretField = Pick<HTMLInputElement, 'value' | 'selectionStart' | 'setSelectionRange'>;

/**
 * The keyboard bridge preventDefaults every arrow (they are remote keys), so
 * the text editors move the caret themselves: LEFT/RIGHT by one character,
 * UP/DOWN to the start/end. Returns true for every direction (all consumed).
 */
export function moveCaret(field: CaretField, direction: Direction): boolean {
  const length = field.value.length;
  const current = field.selectionStart ?? length;
  const next = targetOf(direction, current, length);
  field.setSelectionRange(next, next);
  return true;
}

function targetOf(direction: Direction, current: number, length: number): number {
  switch (direction) {
    case 'LEFT':
      return Math.max(0, current - 1);
    case 'RIGHT':
      return Math.min(length, current + 1);
    case 'UP':
      return 0;
    case 'DOWN':
      return length;
  }
}
