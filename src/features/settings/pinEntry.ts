/**
 * Pure state for the picker-style PIN entry (PIN input method "Picker"):
 * four digit wheels, LEFT/RIGHT moves, UP/DOWN spins (port of Android
 * `PinEntry.kt`).
 */
export const PIN_LENGTH = 4;
const BASE = 10;

export interface PinEntry {
  readonly digits: readonly number[];
  readonly cursor: number;
}

export const EMPTY_PIN_ENTRY: PinEntry = { digits: [0, 0, 0, 0], cursor: 0 };

export function pinValue(entry: PinEntry): string {
  return entry.digits.join('');
}

function spin(entry: PinEntry, delta: number): PinEntry {
  return {
    ...entry,
    digits: entry.digits.map((d, i) => (i === entry.cursor ? (d + delta + BASE) % BASE : d)),
  };
}

export function pinUp(entry: PinEntry): PinEntry {
  return spin(entry, 1);
}

export function pinDown(entry: PinEntry): PinEntry {
  return spin(entry, -1);
}

export function pinLeft(entry: PinEntry): PinEntry {
  return { ...entry, cursor: Math.max(0, entry.cursor - 1) };
}

export function pinRight(entry: PinEntry): PinEntry {
  return { ...entry, cursor: Math.min(PIN_LENGTH - 1, entry.cursor + 1) };
}

/**
 * OK: hands the dialed PIN to `submit` and blanks the wheels — a prompt
 * kept open by a rejected PIN must start over from 0000 with the first
 * wheel active.
 */
export function pinCommit(entry: PinEntry, submit: (pin: string) => void): PinEntry {
  submit(pinValue(entry));
  return EMPTY_PIN_ENTRY;
}

/**
 * Pure rules for the keyboard-style PIN entry (PIN input method "Keyboard"):
 * a masked text field that accepts digits only and commits as soon as the
 * fourth digit lands. Same verify semantics as the wheel.
 */
export function sanitizePin(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PIN_LENGTH);
}

export function isPinComplete(value: string): boolean {
  return value.length === PIN_LENGTH;
}

/** Commit hands the PIN to `submit` and clears the field so a rejected PIN can retry. */
export function keyboardPinCommit(value: string, submit: (pin: string) => void): string {
  submit(value);
  return '';
}
