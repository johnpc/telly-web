import { useEffect } from 'react';
import { startGamepadPolling } from './gamepad';
import { createKeyboardBridge } from './keyboardBridge';
import type { KeyRouter } from './keyRouter';

/** Adds a window listener and returns its remover. */
function listen<K extends keyof WindowEventMap>(
  type: K,
  handler: (e: WindowEventMap[K]) => void,
): () => void {
  window.addEventListener(type, handler);
  return () => window.removeEventListener(type, handler);
}

/** Feeds window keyboard events and gamepad input into `router` while mounted. */
export function useRemoteKeys(router: KeyRouter): void {
  useEffect(() => {
    const bridge = createKeyboardBridge(router);
    const stops = [
      listen('keydown', bridge.onKeyDown),
      listen('keyup', bridge.onKeyUp),
      listen('blur', bridge.onBlur),
      startGamepadPolling((key) => router.dispatch(key)),
    ];
    return () => stops.forEach((stop) => stop());
  }, [router]);
}
