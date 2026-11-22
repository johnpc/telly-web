// Gamepad fallback for the remote (standard mapping). Xbox Edge already turns
// the controller into keyboard events; this covers browsers that do not.
import type { RemoteKey, SimpleRemoteKey } from './remoteKeys';

/** Standard-mapping button index → remote key (A=OK, B=BACK, bumpers=CH−/CH+, menu, D-pad). */
export const GAMEPAD_BUTTONS: Readonly<Record<number, SimpleRemoteKey>> = {
  0: 'OK',
  1: 'BACK',
  4: 'CHANNEL_DOWN',
  5: 'CHANNEL_UP',
  9: 'MENU',
  12: 'UP',
  13: 'DOWN',
  14: 'LEFT',
  15: 'RIGHT',
};

export const STICK_DEADZONE = 0.5;
export const REPEAT_INITIAL_MS = 400;
export const REPEAT_INTERVAL_MS = 120;

/** Keys that auto-repeat while held, like a browser does for arrow keys. */
const REPEATING = new Set<SimpleRemoteKey>(['UP', 'DOWN', 'LEFT', 'RIGHT', 'CHANNEL_UP', 'CHANNEL_DOWN']);

/** The part of `Gamepad` we read; tests build these by hand. */
export interface GamepadLike {
  readonly buttons: readonly { readonly pressed: boolean }[];
  readonly axes: readonly number[];
}

/** Left stick: axis index → [key past the negative deadzone, key past the positive one]. */
const STICK_AXES: readonly (readonly [number, SimpleRemoteKey, SimpleRemoteKey])[] = [
  [0, 'LEFT', 'RIGHT'],
  [1, 'UP', 'DOWN'],
];

function buttonKeys(pad: GamepadLike): SimpleRemoteKey[] {
  return pad.buttons.flatMap((button, index) => {
    const key = GAMEPAD_BUTTONS[index];
    return button.pressed && key !== undefined ? [key] : [];
  });
}

function stickKeys(pad: GamepadLike): SimpleRemoteKey[] {
  return STICK_AXES.flatMap(([axis, negative, positive]) => {
    const value = pad.axes[axis] ?? 0;
    if (value <= -STICK_DEADZONE) return [negative];
    return value >= STICK_DEADZONE ? [positive] : [];
  });
}

/** Every remote key currently held on one pad (buttons + left stick past the deadzone). */
export function gamepadToRemoteKeys(pad: GamepadLike): SimpleRemoteKey[] {
  return [...new Set([...buttonKeys(pad), ...stickKeys(pad)])];
}

export interface GamepadPollerDeps {
  getGamepads(): readonly (GamepadLike | null)[];
  now(): number;
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
}

function browserDeps(): GamepadPollerDeps {
  return {
    getGamepads: () => (typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []),
    now: () => performance.now(),
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
  };
}

function heldKeys(deps: GamepadPollerDeps): Set<SimpleRemoteKey> {
  const held = new Set<SimpleRemoteKey>();
  for (const pad of deps.getGamepads()) {
    if (pad !== null) gamepadToRemoteKeys(pad).forEach((key) => held.add(key));
  }
  return held;
}

/** Per-key repeat timing: edge-fires on press, then repeats (400 ms, then every 120 ms) repeating keys. */
class RepeatClock {
  private readonly due = new Map<SimpleRemoteKey, number>();

  /** Forget keys that are no longer held. */
  prune(held: ReadonlySet<SimpleRemoteKey>): void {
    for (const key of [...this.due.keys()]) if (!held.has(key)) this.due.delete(key);
  }

  /** True when `key` should fire at `now`; schedules its next repeat. */
  shouldFire(key: SimpleRemoteKey, now: number): boolean {
    const delay = this.nextDelay(key, now);
    if (delay === null) return false;
    this.due.set(key, now + delay);
    return true;
  }

  private nextDelay(key: SimpleRemoteKey, now: number): number | null {
    const due = this.due.get(key);
    if (due === undefined) return REPEAT_INITIAL_MS;
    return REPEATING.has(key) && now >= due ? REPEAT_INTERVAL_MS : null;
  }
}

/** One poll: forget released keys, then edge-fire / repeat every held key. */
function createPollStep(deps: GamepadPollerDeps, dispatch: (key: RemoteKey) => void): () => void {
  const clock = new RepeatClock();
  return () => {
    const held = heldKeys(deps);
    clock.prune(held);
    const now = deps.now();
    for (const key of held) if (clock.shouldFire(key, now)) dispatch(key);
  };
}

/** Polls connected gamepads every animation frame; returns a stop function. */
export function startGamepadPolling(
  dispatch: (key: RemoteKey) => void,
  deps: GamepadPollerDeps = browserDeps(),
): () => void {
  const step = createPollStep(deps, dispatch);
  let frame = 0;
  const tick = (): void => {
    step();
    frame = deps.requestFrame(tick);
  };
  frame = deps.requestFrame(tick);
  return () => deps.cancelFrame(frame);
}
