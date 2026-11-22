// window keydown/keyup → decodeRemoteKey → HoldKeyDetector (Enter only) → KeyRouter.
// Pure logic; `useRemoteKeys` only attaches it to the window.
import { HoldKeyDetector } from './holdKeyDetector';
import type { KeyRouter } from './keyRouter';
import { decodeRemoteKey, isDirection, type RemoteKey } from './remoteKeys';

export interface KeyboardBridge {
  onKeyDown(e: KeyboardEvent): void;
  onKeyUp(e: KeyboardEvent): void;
  /** Window lost focus mid-press: forget the press so no stray OK fires. */
  onBlur(): void;
}

function handleKeyDown(router: KeyRouter, okHold: HoldKeyDetector<RemoteKey>, e: KeyboardEvent): void {
  const key = decodeRemoteKey(e);
  if (key === null) return;
  if (key === 'OK') {
    // Only OK goes through hold detection; arrows must keep auto-repeating.
    okHold.onDown(e.repeat);
    e.preventDefault();
    return;
  }
  if (router.dispatch(key) || isDirection(key)) e.preventDefault();
}

export function createKeyboardBridge(router: KeyRouter, holdMs?: number): KeyboardBridge {
  const dispatch = (key: RemoteKey): void => {
    router.dispatch(key);
  };
  const okHold = new HoldKeyDetector<RemoteKey>('OK', 'LONG_OK', dispatch, holdMs);
  return {
    onKeyDown: (e) => handleKeyDown(router, okHold, e),
    onKeyUp: (e) => {
      if (decodeRemoteKey(e) === 'OK') okHold.onUp();
    },
    onBlur: () => okHold.cancel(),
  };
}
