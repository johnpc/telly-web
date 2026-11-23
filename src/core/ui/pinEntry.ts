import type { RemoteKey } from '@/core/input/remoteKeys';

// @stateMachine('PIN entry')
/**
 * THE one PIN-entry machine every prompt renders (Android `SettingsScreenPinEntry`,
 * wheels or masked keyboard per "PIN input method"):
 *
 *   Typing(wheel, typed) ── 4th digit lands, or OK ──▶ Submitted(pin)
 *   Submitted ── host resolved (accept → prompt unmounts; reject → stays) ──▶ Typing(blank)
 *
 * A PIN commits EXACTLY once: while `Submitted` every key and keystroke is
 * ignored, so a TV IME's trailing Enter after the fourth digit cannot flip a
 * persisted flag twice. A rejected PIN starts over from 0000 / an empty field.
 */
export const PIN_LENGTH = 4;
const BASE = 10;

export interface PinWheel {
  readonly digits: readonly number[];
  readonly cursor: number;
}

export type PinEntryState =
  | { readonly kind: 'Typing'; readonly wheel: PinWheel; readonly typed: string }
  | { readonly kind: 'Submitted'; readonly pin: string };

export const BLANK_WHEEL: PinWheel = { digits: [0, 0, 0, 0], cursor: 0 };
export const BLANK_PIN_ENTRY: PinEntryState = { kind: 'Typing', wheel: BLANK_WHEEL, typed: '' };

export function pinValue(wheel: PinWheel): string {
  return wheel.digits.join('');
}

/** What a renderer shows: blank wheels / an empty field while the host is deciding. */
export function pinView(state: PinEntryState): { wheel: PinWheel; typed: string } {
  return state.kind === 'Typing' ? state : { wheel: BLANK_WHEEL, typed: '' };
}

export function sanitizePin(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, PIN_LENGTH);
}

function spin(wheel: PinWheel, delta: number): PinWheel {
  const digits = wheel.digits.map((d, i) => (i === wheel.cursor ? (d + delta + BASE) % BASE : d));
  return { ...wheel, digits };
}

function typeDigit(wheel: PinWheel, digit: number): PinWheel {
  const digits = wheel.digits.map((d, i) => (i === wheel.cursor ? digit : d));
  return { digits, cursor: Math.min(wheel.cursor + 1, PIN_LENGTH - 1) };
}

function move(wheel: PinWheel, delta: number): PinWheel {
  return { ...wheel, cursor: Math.min(Math.max(wheel.cursor + delta, 0), PIN_LENGTH - 1) };
}

const WHEEL_KEYS: Readonly<Record<string, (wheel: PinWheel) => PinWheel>> = {
  UP: (wheel) => spin(wheel, +1),
  DOWN: (wheel) => spin(wheel, -1),
  LEFT: (wheel) => move(wheel, -1),
  RIGHT: (wheel) => move(wheel, +1),
};

function stepWheel(wheel: PinWheel, key: RemoteKey): PinWheel | null {
  if (typeof key === 'object') return typeDigit(wheel, key.digit);
  return WHEEL_KEYS[key]?.(wheel) ?? null;
}

/** A D-pad / digit key on the wheels: the next `Typing` state, or null when the key is not the wheel's. */
export function pinWheelStep(state: PinEntryState, key: RemoteKey): PinEntryState | null {
  if (state.kind !== 'Typing') return null;
  const wheel = stepWheel(state.wheel, key);
  return wheel === null ? null : { ...state, wheel };
}

/** The masked field's text changed: digits only, capped; the fourth digit submits. */
export function pinTyped(state: PinEntryState, raw: string): PinEntryState {
  if (state.kind !== 'Typing') return state;
  const typed = sanitizePin(raw);
  return typed.length === PIN_LENGTH ? { kind: 'Submitted', pin: typed } : { ...state, typed };
}

/** OK: submits the wheels (always a full PIN) or the field (only when something was typed). */
export function pinCommit(state: PinEntryState, keyboard: boolean): PinEntryState {
  if (state.kind !== 'Typing') return state;
  if (!keyboard) return { kind: 'Submitted', pin: pinValue(state.wheel) };
  return state.typed === '' ? state : { kind: 'Submitted', pin: state.typed };
}

/** The host answered (either way): a prompt still mounted starts over blank. */
export function pinResolved(state: PinEntryState): PinEntryState {
  return state.kind === 'Submitted' ? BLANK_PIN_ENTRY : state;
}

/**
 * A remote key for the prompt: `Submitted` is deaf (handled, unchanged); OK
 * commits; a digit types into the field (keyboard) or the active wheel;
 * null means the key is not the entry's and falls through.
 */
export function pinKey(state: PinEntryState, key: RemoteKey, keyboard: boolean): PinEntryState | null {
  if (state.kind === 'Submitted') return state;
  if (key === 'OK') return pinCommit(state, keyboard);
  if (keyboard && typeof key === 'object') return pinTyped(state, state.typed + key.digit);
  return pinWheelStep(state, key);
}
