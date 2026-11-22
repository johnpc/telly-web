import { describe, expect, it } from 'vitest';
import { digit } from '@/core/input/remoteKeys';
import { EMPTY_PIN, PinKeyboard, pinStep, pinValue } from './pinEntry';

describe('pinEntry', () => {
  it('spins, moves and types digits within four wheels', () => {
    let entry = EMPTY_PIN;
    entry = pinStep(entry, 'UP') ?? entry;
    entry = pinStep(entry, 'UP') ?? entry;
    entry = pinStep(entry, 'DOWN') ?? entry;
    expect(pinValue(entry)).toBe('1000');
    entry = pinStep(entry, 'DOWN') ?? entry;
    entry = pinStep(entry, 'DOWN') ?? entry;
    expect(pinValue(entry)).toBe('9000');
    entry = pinStep(entry, 'LEFT') ?? entry;
    expect(entry.cursor).toBe(0);
    entry = pinStep(entry, 'RIGHT') ?? entry;
    entry = pinStep(entry, digit(4)) ?? entry;
    expect(pinValue(entry)).toBe('9400');
    expect(entry.cursor).toBe(2);
    entry = pinStep(entry, 'RIGHT') ?? entry;
    entry = pinStep(entry, 'RIGHT') ?? entry;
    entry = pinStep(entry, 'RIGHT') ?? entry;
    expect(entry.cursor).toBe(3);
    entry = pinStep(entry, digit(7)) ?? entry;
    expect(pinValue(entry)).toBe('9407');
    expect(entry.cursor).toBe(3);
    expect(pinStep(entry, 'OK')).toBeNull();
    expect(pinStep(entry, 'MENU')).toBeNull();
  });

  it('keyboard entry keeps digits only and completes at four', () => {
    expect(PinKeyboard.sanitize('12a3-456')).toBe('1234');
    expect(PinKeyboard.isComplete('123')).toBe(false);
    expect(PinKeyboard.isComplete('1234')).toBe(true);
  });
});
