import { describe, expect, it } from 'vitest';
import { digit } from '@/core/input/remoteKeys';
import {
  BLANK_PIN_ENTRY,
  BLANK_WHEEL,
  pinCommit,
  pinResolved,
  pinTyped,
  pinValue,
  pinView,
  pinWheelStep,
  sanitizePin,
  type PinEntryState,
} from './pinEntry';

const step = (state: PinEntryState, ...keys: Parameters<typeof pinWheelStep>[1][]): PinEntryState =>
  keys.reduce((s, key) => pinWheelStep(s, key) ?? s, state);
const wheelOf = (state: PinEntryState): string => pinValue(pinView(state).wheel);

describe('PinEntryState', () => {
  it('spins, moves and types digits within four wheels; non-wheel keys are not its', () => {
    let state = step(BLANK_PIN_ENTRY, 'UP', 'UP', 'DOWN');
    expect(wheelOf(state)).toBe('1000');
    state = step(state, 'DOWN', 'DOWN');
    expect(wheelOf(state)).toBe('9000');
    state = step(state, 'LEFT');
    expect(pinView(state).wheel.cursor).toBe(0);
    state = step(state, 'RIGHT', digit(4));
    expect(wheelOf(state)).toBe('9400');
    expect(pinView(state).wheel.cursor).toBe(2);
    state = step(state, 'RIGHT', 'RIGHT', 'RIGHT', digit(7));
    expect(wheelOf(state)).toBe('9407');
    expect(pinView(state).wheel.cursor).toBe(3);
    expect(pinWheelStep(state, 'OK')).toBeNull();
    expect(pinWheelStep(state, 'MENU')).toBeNull();
  });

  it('OK on the wheels submits the dialed PIN exactly once; the host answer blanks it', () => {
    const dialed = step(BLANK_PIN_ENTRY, 'UP', 'UP', 'RIGHT', 'UP');
    const submitted = pinCommit(dialed, false);
    expect(submitted).toEqual({ kind: 'Submitted', pin: '2100' });
    expect(pinCommit(submitted, false)).toBe(submitted);
    expect(pinWheelStep(submitted, 'UP')).toBeNull();
    expect(pinTyped(submitted, '1')).toBe(submitted);
    expect(pinView(submitted)).toEqual({ wheel: BLANK_WHEEL, typed: '' });
    expect(pinResolved(submitted)).toBe(BLANK_PIN_ENTRY);
    expect(pinResolved(dialed)).toBe(dialed);
  });

  it('the keyboard field keeps digits only, submits on the fourth digit, OK submits a partial PIN but never an empty one', () => {
    expect(sanitizePin('2a4-68 1')).toBe('2468');
    const partial = pinTyped(BLANK_PIN_ENTRY, '12x');
    expect(pinView(partial).typed).toBe('12');
    expect(pinTyped(partial, '1234')).toEqual({ kind: 'Submitted', pin: '1234' });
    expect(pinCommit(BLANK_PIN_ENTRY, true)).toBe(BLANK_PIN_ENTRY);
    expect(pinCommit(partial, true)).toEqual({ kind: 'Submitted', pin: '12' });
  });
});
