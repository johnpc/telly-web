import { Observable } from '@/core/state/observable';
import type { RemoteKey } from './remoteKeys';

// @stateMachine('Startup key hold')
/**
 * Keys pressed while a screen cannot act yet (leasing its engine, loading its
 * first rows, waiting for search results) are HELD, then replayed ONE PER
 * COMMIT once it can — exactly as if the remote had waited for the screen
 * (Android's input queue gives this for free). One machine for the guide,
 * fullscreen playback and search:
 *
 *   Holding(keys) ── ready ──▶ Replaying(remaining) ── drained ──▶ Live
 *   Live / Replaying ── not ready any more ──▶ Holding(remaining)
 */
export type KeyHold =
  | { readonly kind: 'Holding'; readonly keys: readonly RemoteKey[] }
  | { readonly kind: 'Replaying'; readonly remaining: readonly RemoteKey[] }
  | { readonly kind: 'Live' };

const HOLDING_NONE: KeyHold = { kind: 'Holding', keys: [] };
const LIVE: KeyHold = { kind: 'Live' };

function replaying(remaining: readonly RemoteKey[]): KeyHold {
  return remaining.length === 0 ? LIVE : { kind: 'Replaying', remaining };
}

function onReady(s: KeyHold): KeyHold {
  return s.kind === 'Holding' ? replaying(s.keys) : s;
}

function onNotReady(s: KeyHold): KeyHold {
  if (s.kind === 'Holding') return s;
  return s.kind === 'Replaying' ? { kind: 'Holding', keys: s.remaining } : HOLDING_NONE;
}

export class KeyQueue extends Observable {
  private current: KeyHold = HOLDING_NONE;

  get state(): KeyHold {
    return this.current;
  }

  /** Keys parked or still to replay. */
  get size(): number {
    const s = this.current;
    return s.kind === 'Holding' ? s.keys.length : s.kind === 'Replaying' ? s.remaining.length : 0;
  }

  /** Parks `key` while Holding and reports true; otherwise false (the key goes on to the live handlers). */
  hold(key: RemoteKey): boolean {
    if (this.current.kind !== 'Holding') return false;
    this.set({ kind: 'Holding', keys: [...this.current.keys, key] });
    return true;
  }

  /** The screen can act (or stopped being able to): Holding → Replaying / Live; Live or Replaying → Holding. */
  setReady(ready: boolean): void {
    this.set((ready ? onReady : onNotReady)(this.current));
  }

  /**
   * One replay step for the commit that rendered `version`: the oldest held key,
   * or undefined when nothing is replaying or this commit's key already went
   * (StrictMode re-runs mount effects). Draining the last key goes Live.
   */
  replayOne(version: number): RemoteKey | undefined {
    const s = this.current;
    if (s.kind !== 'Replaying' || version !== this.version) return undefined;
    const [key, ...remaining] = s.remaining;
    this.set(replaying(remaining));
    return key;
  }

  private set(next: KeyHold): void {
    if (next === this.current) return;
    this.current = next;
    this.notify();
  }
}
