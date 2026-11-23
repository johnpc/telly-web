import { describe, expect, it } from 'vitest';
import {
  decodeRemoteKey,
  digit,
  isDigit,
  isDirection,
  isTextEntryTarget,
  type RemoteKey,
  type RemoteKeyEvent,
} from './remoteKeys';

function event(key: string, extra: Partial<RemoteKeyEvent> = {}): RemoteKeyEvent {
  return { key, target: null, ctrlKey: false, metaKey: false, altKey: false, ...extra };
}

function input(type: string): HTMLInputElement {
  const el = document.createElement('input');
  el.type = type;
  return el;
}

describe('decodeRemoteKey', () => {
  it.each<[string, RemoteKey]>([
    ['ArrowUp', 'UP'],
    ['ArrowDown', 'DOWN'],
    ['ArrowLeft', 'LEFT'],
    ['ArrowRight', 'RIGHT'],
    ['Enter', 'OK'],
    [' ', 'OK'],
    ['Escape', 'BACK'],
    ['Backspace', 'BACK'],
    ['GoBack', 'BACK'],
    ['BrowserBack', 'BACK'],
    ['ChannelUp', 'CHANNEL_UP'],
    ['PageUp', 'CHANNEL_UP'],
    ['ChannelDown', 'CHANNEL_DOWN'],
    ['PageDown', 'CHANNEL_DOWN'],
    ['ContextMenu', 'MENU'],
    ['m', 'MENU'],
    ['MediaRewind', 'REWIND'],
    ['MediaTrackPrevious', 'REWIND'],
    [',', 'REWIND'],
    ['MediaFastForward', 'FAST_FORWARD'],
    ['MediaTrackNext', 'FAST_FORWARD'],
    ['.', 'FAST_FORWARD'],
    ['MediaPlayPause', 'PLAY_PAUSE'],
    ['p', 'PLAY_PAUSE'],
    ['0', digit(0)],
    ['7', digit(7)],
  ])('maps %s per the CLAUDE.md table', (key, expected) => {
    expect(decodeRemoteKey(event(key))).toEqual(expected);
  });

  it('ignores keys that are not remote keys', () => {
    expect(decodeRemoteKey(event('Tab'))).toBeNull();
    expect(decodeRemoteKey(event('x'))).toBeNull();
    expect(decodeRemoteKey(event('F5'))).toBeNull();
  });

  it('leaves modified keys to the browser', () => {
    expect(decodeRemoteKey(event('ArrowDown', { ctrlKey: true }))).toBeNull();
    expect(decodeRemoteKey(event('Enter', { metaKey: true }))).toBeNull();
    expect(decodeRemoteKey(event('Backspace', { altKey: true }))).toBeNull();
  });

  it('lets typing keys through to a text field but still decodes navigation keys there', () => {
    const target = input('text');
    expect(decodeRemoteKey(event(' ', { target }))).toBeNull();
    expect(decodeRemoteKey(event('Backspace', { target }))).toBeNull();
    expect(decodeRemoteKey(event('m', { target }))).toBeNull();
    expect(decodeRemoteKey(event('5', { target }))).toBeNull();
    expect(decodeRemoteKey(event('Enter', { target }))).toBe('OK');
    expect(decodeRemoteKey(event('Escape', { target }))).toBe('BACK');
    expect(decodeRemoteKey(event('ArrowDown', { target }))).toBe('DOWN');
  });

  it('treats Space as OK on a non-text input such as a checkbox', () => {
    expect(decodeRemoteKey(event(' ', { target: input('checkbox') }))).toBe('OK');
  });
});

describe('isTextEntryTarget', () => {
  it('recognises inputs, textareas and contenteditable hosts', () => {
    expect(isTextEntryTarget(input('text'))).toBe(true);
    expect(isTextEntryTarget(input('search'))).toBe(true);
    expect(isTextEntryTarget(document.createElement('textarea'))).toBe(true);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(isTextEntryTarget(editable)).toBe(true);
    const bare = document.createElement('div');
    bare.setAttribute('contenteditable', '');
    expect(isTextEntryTarget(bare)).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget(document)).toBe(false);
    expect(isTextEntryTarget(document.createElement('div'))).toBe(false);
    expect(isTextEntryTarget(input('range'))).toBe(false);
    const off = document.createElement('div');
    off.setAttribute('contenteditable', 'false');
    expect(isTextEntryTarget(off)).toBe(false);
  });
});

describe('key predicates', () => {
  it('tell directions and digits apart', () => {
    expect(isDirection('UP')).toBe(true);
    expect(isDirection('OK')).toBe(false);
    expect(isDirection(digit(1))).toBe(false);
    expect(isDigit(digit(3))).toBe(true);
    expect(isDigit('BACK')).toBe(false);
  });
});

describe('TV browser key codes', () => {
  it('maps webOS/Tizen numeric codes when the key name is missing', () => {
    expect(decodeRemoteKey(event('Unidentified', { keyCode: 461 }))).toBe('BACK');
    expect(decodeRemoteKey(event('', { keyCode: 10009 }))).toBe('BACK');
    expect(decodeRemoteKey(event('', { keyCode: 427 }))).toBe('CHANNEL_UP');
    expect(decodeRemoteKey(event('', { keyCode: 428 }))).toBe('CHANNEL_DOWN');
    expect(decodeRemoteKey(event('', { keyCode: 10252 }))).toBe('PLAY_PAUSE');
    expect(decodeRemoteKey(event('ArrowUp', { keyCode: 461 }))).toBe('UP');
    expect(decodeRemoteKey(event('', { keyCode: 999 }))).toBeNull();
  });
});
