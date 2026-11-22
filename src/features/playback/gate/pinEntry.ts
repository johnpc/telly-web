import type { RemoteKey } from '@/core/input/remoteKeys';

/**
 * Pure state for the picker-style PIN entry ("PIN input method" = Picker):
 * four digit wheels, LEFT/RIGHT moves, UP/DOWN spins, a digit key types into
 * the active wheel and advances, OK commits (Android `PinEntry`).
 */
export const PIN_LENGTH = 4;
const BASE = 10;

export interface PinEntry {
  digits: readonly number[];
  cursor: number;
}

export const EMPTY_PIN: PinEntry = { digits: [0, 0, 0, 0], cursor: 0 };

export function pinValue(entry: PinEntry): string {
  return entry.digits.join('');
}

function spin(entry: PinEntry, delta: number): PinEntry {
  const digits = entry.digits.map((d, i) => (i === entry.cursor ? (d + delta + BASE) % BASE : d));
  return { ...entry, digits };
}

function typeDigit(entry: PinEntry, digit: number): PinEntry {
  const digits = entry.digits.map((d, i) => (i === entry.cursor ? digit : d));
  return { digits, cursor: Math.min(entry.cursor + 1, PIN_LENGTH - 1) };
}

/** The next wheel state for a key, or null when the key is not the wheel's (OK commits elsewhere). */
export function pinStep(entry: PinEntry, key: RemoteKey): PinEntry | null {
  if (typeof key === 'object') return typeDigit(entry, key.digit);
  switch (key) {
    case 'UP':
      return spin(entry, +1);
    case 'DOWN':
      return spin(entry, -1);
    case 'LEFT':
      return { ...entry, cursor: Math.max(entry.cursor - 1, 0) };
    case 'RIGHT':
      return { ...entry, cursor: Math.min(entry.cursor + 1, PIN_LENGTH - 1) };
    default:
      return null;
  }
}

/** Keyboard-style entry: digits only, capped, complete at four. */
export const PinKeyboard = {
  sanitize(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, PIN_LENGTH);
  },
  isComplete(value: string): boolean {
    return value.length === PIN_LENGTH;
  },
};
