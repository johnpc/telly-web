import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  gamepadToRemoteKeys,
  REPEAT_INITIAL_MS,
  REPEAT_INTERVAL_MS,
  startGamepadPolling,
  type GamepadLike,
  type GamepadPollerDeps,
} from './gamepad';
import type { RemoteKey } from './remoteKeys';

function pad(pressed: number[], axes: number[] = [0, 0]): GamepadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) }));
  return { buttons, axes };
}

describe('gamepadToRemoteKeys', () => {
  it('maps the standard buttons', () => {
    expect(gamepadToRemoteKeys(pad([0]))).toEqual(['OK']);
    expect(gamepadToRemoteKeys(pad([1]))).toEqual(['BACK']);
    expect(gamepadToRemoteKeys(pad([12, 15]))).toEqual(['UP', 'RIGHT']);
    expect(gamepadToRemoteKeys(pad([4, 5, 9]))).toEqual(['CHANNEL_DOWN', 'CHANNEL_UP', 'MENU']);
    expect(gamepadToRemoteKeys(pad([2, 3, 7]))).toEqual([]);
  });

  it('reads the left stick past the deadzone and de-duplicates against the D-pad', () => {
    expect(gamepadToRemoteKeys(pad([], [-0.9, 0]))).toEqual(['LEFT']);
    expect(gamepadToRemoteKeys(pad([], [0.6, 0]))).toEqual(['RIGHT']);
    expect(gamepadToRemoteKeys(pad([], [0, -1]))).toEqual(['UP']);
    expect(gamepadToRemoteKeys(pad([], [0, 0.5]))).toEqual(['DOWN']);
    expect(gamepadToRemoteKeys(pad([], [0.3, -0.49]))).toEqual([]);
    expect(gamepadToRemoteKeys(pad([14], [-1, 0]))).toEqual(['LEFT']);
    expect(gamepadToRemoteKeys({ buttons: [], axes: [] })).toEqual([]);
  });
});

interface Harness {
  deps: GamepadPollerDeps;
  tick(at: number, pads: GamepadLike[]): void;
  dispatched: RemoteKey[];
  cancelled: number[];
}

function harness(): Harness {
  let now = 0;
  let pads: GamepadLike[] = [];
  let callback: (() => void) | null = null;
  let handle = 0;
  const cancelled: number[] = [];
  const deps: GamepadPollerDeps = {
    getGamepads: () => [...pads, null],
    now: () => now,
    requestFrame: (cb) => {
      callback = cb;
      handle += 1;
      return handle;
    },
    cancelFrame: (h) => cancelled.push(h),
  };
  return {
    deps,
    dispatched: [],
    cancelled,
    tick(at, next) {
      now = at;
      pads = next;
      callback?.();
    },
  };
}

describe('startGamepadPolling', () => {
  it('edge-fires a direction, then repeats after 400 ms and every 120 ms while held', () => {
    const h = harness();
    startGamepadPolling((key) => h.dispatched.push(key), h.deps);
    h.tick(0, [pad([15])]);
    h.tick(100, [pad([15])]);
    h.tick(REPEAT_INITIAL_MS - 1, [pad([15])]);
    expect(h.dispatched).toEqual(['RIGHT']);
    h.tick(REPEAT_INITIAL_MS, [pad([15])]);
    expect(h.dispatched).toEqual(['RIGHT', 'RIGHT']);
    h.tick(REPEAT_INITIAL_MS + REPEAT_INTERVAL_MS - 1, [pad([15])]);
    expect(h.dispatched).toHaveLength(2);
    h.tick(REPEAT_INITIAL_MS + REPEAT_INTERVAL_MS, [pad([15])]);
    expect(h.dispatched).toHaveLength(3);
  });

  it('fires OK and BACK once per press, never repeating', () => {
    const h = harness();
    startGamepadPolling((key) => h.dispatched.push(key), h.deps);
    h.tick(0, [pad([0, 1])]);
    h.tick(1000, [pad([0, 1])]);
    h.tick(2000, [pad([0, 1])]);
    expect(h.dispatched).toEqual(['OK', 'BACK']);
  });

  it('re-arms a key after release and stops polling when asked', () => {
    const h = harness();
    const stop = startGamepadPolling((key) => h.dispatched.push(key), h.deps);
    h.tick(0, [pad([13])]);
    h.tick(50, [pad([])]);
    h.tick(60, [pad([13])]);
    expect(h.dispatched).toEqual(['DOWN', 'DOWN']);
    stop();
    expect(h.cancelled).toEqual([4]);
  });

  it('polls navigator.getGamepads through requestAnimationFrame by default', () => {
    const frames: FrameRequestCallback[] = [];
    let handle = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      handle += 1;
      return handle;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const dispatched: RemoteKey[] = [];
    const stop = startGamepadPolling((key) => dispatched.push(key));
    frames.shift()?.(0);
    expect(dispatched).toEqual([]);
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad([0])] });
    frames.shift()?.(16);
    expect(dispatched).toEqual(['OK']);
    stop();
    expect(cancel).toHaveBeenCalledWith(3);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'getGamepads');
});
