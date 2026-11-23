import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { Observable } from '@/core/state/observable';

export const HINT_KEY = 'guide.hint.shown';
export const HINT_HIDE_AFTER_MS = 15_000;

/**
 * The first-open hint toast lines (captures 24/26/27): bold key, then the rest. Android's third
 * line is "Long Left"; browsers auto-repeat a held arrow so the web's day jump is REWIND
 * (MediaRewind / the `,` key) and the copy names that key instead.
 */
export const HINT_LINES: readonly (readonly [string, string])[] = [
  ['Long OK', 'open menu'],
  ['Left', 'show groups'],
  ['Rewind (,)', 'navigate to past programs'],
];

/** True exactly once per install: the store remembers the toast was shown. */
export function claimHint(store: KeyValueStore): boolean {
  if (store.get(HINT_KEY) !== null) return false;
  store.set(HINT_KEY, '1');
  return true;
}

// @stateMachine('Guide hint')
/** Unseen · Showing(hide) · Seen — the toast's timer lives IN the state; the persisted claim happens in `start`, never during a render. */
export type HintState =
  | { readonly kind: 'Unseen' }
  | { readonly kind: 'Showing'; readonly hide: ReturnType<typeof setTimeout> }
  | { readonly kind: 'Seen' };

export class GuideHint extends Observable {
  private current: HintState = { kind: 'Unseen' };

  constructor(
    private readonly store: KeyValueStore,
    private readonly hideAfterMs: number = HINT_HIDE_AFTER_MS,
  ) {
    super();
  }

  get state(): HintState {
    return this.current;
  }

  /** Claims the one showing per install (or finds it already claimed); returns the stop. */
  start(): () => void {
    if (this.current.kind !== 'Unseen') return () => undefined;
    if (!claimHint(this.store)) {
      this.set({ kind: 'Seen' });
      return () => undefined;
    }
    this.set({ kind: 'Showing', hide: setTimeout(() => this.set({ kind: 'Seen' }), this.hideAfterMs) });
    return () => this.stop();
  }

  /** Unmounted mid-toast: the timer goes with it. */
  private stop(): void {
    if (this.current.kind === 'Showing') clearTimeout(this.current.hide);
    this.set({ kind: 'Seen' });
  }

  private set(next: HintState): void {
    this.current = next;
    this.notify();
  }
}
