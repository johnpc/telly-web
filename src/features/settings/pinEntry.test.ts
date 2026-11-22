import { describe, expect, it } from 'vitest';
import {
  EMPTY_PIN_ENTRY,
  isPinComplete,
  keyboardPinCommit,
  pinCommit,
  pinDown,
  pinLeft,
  pinRight,
  pinUp,
  pinValue,
  sanitizePin,
} from './pinEntry';

describe('PinEntry', () => {
  it('spins the active wheel, moves the cursor within bounds and commits then blanks', () => {
    let entry = pinUp(pinUp(EMPTY_PIN_ENTRY));
    entry = pinRight(entry);
    entry = pinDown(entry);
    expect(pinValue(entry)).toBe('2900');
    expect(pinLeft(pinLeft(pinLeft(entry))).cursor).toBe(0);
    expect(pinRight(pinRight(pinRight(pinRight(entry)))).cursor).toBe(3);
    const submitted: string[] = [];
    const after = pinCommit(entry, (pin) => submitted.push(pin));
    expect(submitted).toEqual(['2900']);
    expect(after).toBe(EMPTY_PIN_ENTRY);
  });

  it('keyboard entry keeps digits only, caps at four and clears on commit', () => {
    expect(sanitizePin('2a4-68 1')).toBe('2468');
    expect(isPinComplete('246')).toBe(false);
    expect(isPinComplete('2468')).toBe(true);
    const submitted: string[] = [];
    expect(keyboardPinCommit('2468', (pin) => submitted.push(pin))).toBe('');
    expect(submitted).toEqual(['2468']);
  });
});
