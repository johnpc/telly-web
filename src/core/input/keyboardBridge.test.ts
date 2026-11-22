import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS } from './holdKeyDetector';
import { createKeyboardBridge } from './keyboardBridge';
import { KeyRouter } from './keyRouter';
import type { RemoteKey } from './remoteKeys';

function keyEvent(type: 'keydown' | 'keyup', key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent(type, { key, cancelable: true, ...init });
}

describe('keyboardBridge', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(handled = true): { bridge: ReturnType<typeof createKeyboardBridge>; keys: RemoteKey[] } {
    const keys: RemoteKey[] = [];
    const router = new KeyRouter({
      moveFocus: () => handled,
      activate: () => handled,
      back: () => undefined,
    });
    router.push((key) => {
      keys.push(key);
      return handled;
    });
    return { bridge: createKeyboardBridge(router), keys };
  }

  it('turns a short Enter press into one OK on key-up', () => {
    const { bridge, keys } = setup();
    const down = keyEvent('keydown', 'Enter');
    bridge.onKeyDown(down);
    expect(down.defaultPrevented).toBe(true);
    expect(keys).toEqual([]);
    bridge.onKeyUp(keyEvent('keyup', 'Enter'));
    expect(keys).toEqual(['OK']);
  });

  it('turns Enter held ≥ 500 ms into one LONG_OK, ignoring auto-repeats', () => {
    const { bridge, keys } = setup();
    bridge.onKeyDown(keyEvent('keydown', 'Enter'));
    for (let i = 0; i < 5; i += 1) bridge.onKeyDown(keyEvent('keydown', 'Enter', { repeat: true }));
    vi.advanceTimersByTime(HOLD_MS);
    bridge.onKeyUp(keyEvent('keyup', 'Enter'));
    expect(keys).toEqual(['LONG_OK']);
  });

  it('passes every arrow key-down through, repeats included, and prevents scrolling', () => {
    const { bridge, keys } = setup(false);
    const first = keyEvent('keydown', 'ArrowDown');
    const repeat = keyEvent('keydown', 'ArrowDown', { repeat: true });
    bridge.onKeyDown(first);
    bridge.onKeyDown(repeat);
    expect(keys).toEqual(['DOWN', 'DOWN']);
    expect(first.defaultPrevented).toBe(true);
    expect(repeat.defaultPrevented).toBe(true);
  });

  it('prevents the default only for handled non-arrow keys', () => {
    const handled = setup(true);
    const e1 = keyEvent('keydown', 'm');
    handled.bridge.onKeyDown(e1);
    expect(e1.defaultPrevented).toBe(true);
    const unhandled = setup(false);
    const e2 = keyEvent('keydown', '5');
    unhandled.bridge.onKeyDown(e2);
    expect(unhandled.keys).toEqual([{ kind: 'DIGIT', digit: 5 }]);
    expect(e2.defaultPrevented).toBe(false);
  });

  it('ignores keys that are not remote keys and key-ups other than OK', () => {
    const { bridge, keys } = setup();
    const e = keyEvent('keydown', 'Tab');
    bridge.onKeyDown(e);
    bridge.onKeyUp(keyEvent('keyup', 'ArrowUp'));
    expect(keys).toEqual([]);
    expect(e.defaultPrevented).toBe(false);
  });

  it('forgets a pending OK when the window blurs', () => {
    const { bridge, keys } = setup();
    bridge.onKeyDown(keyEvent('keydown', 'Enter'));
    bridge.onBlur();
    bridge.onKeyUp(keyEvent('keyup', 'Enter'));
    vi.advanceTimersByTime(HOLD_MS);
    expect(keys).toEqual([]);
  });
});
