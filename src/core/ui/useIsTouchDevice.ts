import { useSyncExternalStore } from 'react';

const COARSE_POINTER = '(pointer: coarse)';

function query(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(COARSE_POINTER) : null;
}

function subscribe(onChange: () => void): () => void {
  const mediaQuery = query();
  mediaQuery?.addEventListener('change', onChange);
  return () => mediaQuery?.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return query()?.matches ?? false;
}

/** True when the primary pointer is coarse (a finger): phones and tablets get the soft remote. */
export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
