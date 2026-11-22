import type { RemoteKey } from '@/core/input/remoteKeys';
import { Observable } from './observable';

/**
 * Keys pressed while the guide is still leasing its engine / loading its
 * first rows are parked here and replayed once the grid can act on them —
 * a remote's BACK right after the guide opens must not fall through to the
 * shell (the Android input queue gives the same guarantee for free). An
 * external store: every change notifies, so the replay hook re-runs after
 * each key's render has committed.
 */
export class KeyQueue extends Observable {
  private keys: RemoteKey[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: RemoteKey): void {
    this.keys.push(key);
    this.notify();
  }

  /** The oldest parked key, removed; undefined when empty. */
  shift(): RemoteKey | undefined {
    const key = this.keys.shift();
    if (key !== undefined) this.notify();
    return key;
  }
}
