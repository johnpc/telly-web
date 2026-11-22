import { KeyListeners } from './keyListeners';
import type { KeyValueListener, KeyValueStore } from './keyValueStore';

/** Every telly key is namespaced so other scripts on the origin cannot collide. */
export const STORAGE_PREFIX = 'telly:';

/**
 * `localStorage` adapter; the only browser storage type behind
 * `KeyValueStore` (Android: `SharedPrefsKeyValueStore`). Writes from other
 * tabs arrive through the `storage` event and notify listeners too.
 */
export class LocalStorageKeyValueStore implements KeyValueStore {
  private readonly listeners = new KeyListeners();

  constructor(
    private readonly storage: Storage = window.localStorage,
    eventTarget: Pick<Window, 'addEventListener'> | null = typeof window === 'undefined' ? null : window,
  ) {
    eventTarget?.addEventListener('storage', (event: StorageEvent) => this.onStorage(event));
  }

  get(key: string): string | null {
    return this.storage.getItem(STORAGE_PREFIX + key);
  }

  set(key: string, value: string): void {
    this.storage.setItem(STORAGE_PREFIX + key, value);
    this.listeners.notify(key, value);
  }

  remove(key: string): void {
    this.storage.removeItem(STORAGE_PREFIX + key);
    this.listeners.notify(key, null);
  }

  keys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < this.storage.length; i += 1) {
      const raw = this.storage.key(i);
      if (raw?.startsWith(STORAGE_PREFIX)) out.push(raw.slice(STORAGE_PREFIX.length));
    }
    return out;
  }

  subscribe(key: string, listener: KeyValueListener): () => void {
    return this.listeners.subscribe(key, listener);
  }

  subscribeAll(listener: () => void): () => void {
    return this.listeners.subscribeAll(listener);
  }

  private onStorage(event: StorageEvent): void {
    if (event.storageArea !== this.storage || !event.key?.startsWith(STORAGE_PREFIX)) return;
    this.listeners.notify(event.key.slice(STORAGE_PREFIX.length), event.newValue);
  }
}
