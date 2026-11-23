import type { RemoteKey } from '@/core/input/remoteKeys';
import { Observable } from '@/core/state/observable';
import { BLANK_PIN_ENTRY, pinKey, pinResolved, pinTyped, type PinEntryState } from './pinEntry';

/**
 * Holds one prompt's `PinEntryState` and runs its submission lifecycle: a
 * `Submitted` transition hands the PIN to the host once and, when the host's
 * answer settles (either way), blanks a prompt that is still mounted. Reads
 * are synchronous, so two events in one tick cannot both submit.
 */
export class PinEntryStore extends Observable {
  private state: PinEntryState = BLANK_PIN_ENTRY;

  private host: (pin: string) => unknown = () => undefined;

  /** The host's submit; the hook re-points it on every render so a prompt never calls a stale closure. */
  setHost(host: (pin: string) => unknown): void {
    this.host = host;
  }

  get current(): PinEntryState {
    return this.state;
  }

  /** A remote key; null when the key is not the entry's (the caller lets it fall through). */
  key(key: RemoteKey, keyboard: boolean): true | null {
    const next = pinKey(this.state, key, keyboard);
    if (next === null) return null;
    this.transition(next);
    return true;
  }

  /** The masked field's text changed. */
  readonly typed = (raw: string): void => this.transition(pinTyped(this.state, raw));

  private transition(next: PinEntryState): void {
    if (next === this.state) return;
    this.state = next;
    this.notify();
    if (next.kind !== 'Submitted') return;
    const settle = (): void => {
      if (this.state === next) this.transition(pinResolved(next));
    };
    void Promise.resolve(this.host(next.pin)).then(settle, settle);
  }
}
