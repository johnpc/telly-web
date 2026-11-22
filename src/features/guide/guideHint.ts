import type { KeyValueStore } from '@/core/kv/keyValueStore';

export const HINT_KEY = 'guide.hint.shown';
export const HINT_HIDE_AFTER_MS = 15_000;

/** The first-open hint toast lines (captures 24/26/27): bold key, then the rest. */
export const HINT_LINES: readonly (readonly [string, string])[] = [
  ['Long OK', 'open menu'],
  ['Left', 'show groups'],
  ['Long Left', 'navigate to past programs'],
];

/** True exactly once per install: the store remembers the toast was shown. */
export function claimHint(store: KeyValueStore): boolean {
  if (store.get(HINT_KEY) !== null) return false;
  store.set(HINT_KEY, '1');
  return true;
}
