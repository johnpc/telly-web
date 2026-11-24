// The ONE place keyboard events become remote keys (CLAUDE.md "remote-first").
// Everything downstream consumes `RemoteKey`s, never `KeyboardEvent`s.
import { GAMEPAD_KEY_TABLE } from './gamepadKeys';

/** The D-pad half of the remote; also what the focus engine moves by. */
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** Every remote key that carries no payload. */
export type SimpleRemoteKey =
  | Direction
  | 'OK'
  | 'LONG_OK'
  | 'BACK'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'MENU'
  | 'REWIND'
  | 'FAST_FORWARD'
  | 'PLAY_PAUSE';

/** A number-pad digit (number entry zaps, like the Android app). */
export interface DigitKey {
  kind: 'DIGIT';
  digit: number;
}

export type RemoteKey = SimpleRemoteKey | DigitKey;

export function digit(n: number): DigitKey {
  return { kind: 'DIGIT', digit: n };
}

export function isDigit(key: RemoteKey): key is DigitKey {
  return typeof key === 'object';
}

const DIRECTIONS: ReadonlySet<RemoteKey> = new Set<RemoteKey>(['UP', 'DOWN', 'LEFT', 'RIGHT']);

export function isDirection(key: RemoteKey): key is Direction {
  return DIRECTIONS.has(key);
}

/** `KeyboardEvent.key` → remote key, exactly the table in CLAUDE.md. */
const KEY_TABLE: Readonly<Record<string, SimpleRemoteKey>> = {
  ...GAMEPAD_KEY_TABLE,
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  Enter: 'OK',
  ' ': 'OK',
  Escape: 'BACK',
  Backspace: 'BACK',
  GoBack: 'BACK',
  BrowserBack: 'BACK',
  ChannelUp: 'CHANNEL_UP',
  PageUp: 'CHANNEL_UP',
  ChannelDown: 'CHANNEL_DOWN',
  PageDown: 'CHANNEL_DOWN',
  ContextMenu: 'MENU',
  m: 'MENU',
  MediaRewind: 'REWIND',
  MediaTrackPrevious: 'REWIND',
  ',': 'REWIND',
  MediaFastForward: 'FAST_FORWARD',
  MediaTrackNext: 'FAST_FORWARD',
  '.': 'FAST_FORWARD',
  MediaPlayPause: 'PLAY_PAUSE',
  MediaPlay: 'PLAY_PAUSE',
  MediaPause: 'PLAY_PAUSE',
  p: 'PLAY_PAUSE',
};

/** Input types that do not take typed text, so single-character keys stay remote keys. */
const NON_TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'radio',
  'range',
  'submit',
  'reset',
  'color',
  'file',
]);

/** True when the event target takes typed text (input, textarea, contenteditable). */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const editable = target.getAttribute('contenteditable');
  if (editable !== null && editable !== 'false') return true;
  if (target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type);
}

/** The subset of `KeyboardEvent` the decoder reads; tests pass plain objects. */
export type RemoteKeyEvent = Pick<KeyboardEvent, 'key' | 'target' | 'ctrlKey' | 'metaKey' | 'altKey'> &
  Partial<Pick<KeyboardEvent, 'keyCode'>>;

/**
 * TV browsers that predate the named keys: LG webOS sends Back as 461 and the
 * channel keys as 427/428 with an empty or "Unidentified" `key`; Samsung Tizen
 * sends Back as 10009 (and 10182 for Exit), channel keys 427/428 as well.
 */
const KEY_CODE_TABLE: Readonly<Record<number, SimpleRemoteKey>> = {
  461: 'BACK',
  10009: 'BACK',
  10182: 'BACK',
  427: 'CHANNEL_UP',
  428: 'CHANNEL_DOWN',
  412: 'REWIND',
  417: 'FAST_FORWARD',
  10252: 'PLAY_PAUSE',
  415: 'PLAY_PAUSE',
  19: 'PLAY_PAUSE',
};

/**
 * Decodes one keyboard event. Returns null for anything that is not a remote
 * key, for modified keys (browser shortcuts stay the browser's), and for keys
 * that type into a focused text field (characters, Space, Backspace).
 */
export function decodeRemoteKey(e: RemoteKeyEvent): RemoteKey | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const types = e.key.length === 1 || e.key === 'Backspace';
  if (types && isTextEntryTarget(e.target)) return null;
  if (/^[0-9]$/.test(e.key)) return digit(Number(e.key));
  return KEY_TABLE[e.key] ?? KEY_CODE_TABLE[e.keyCode ?? -1] ?? null;
}
