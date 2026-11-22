import { KeyListeners } from './keyListeners';
import type { KeyValueListener, KeyValueStore } from './keyValueStore';

/** Process-lifetime store for tests and previews (Android `InMemoryKeyValueStore`). */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly map: Map<string, string>;
  private readonly listeners = new KeyListeners();

  constructor(initial: Record<string, string> = {}) {
    this.map = new Map(Object.entries(initial));
  }

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
    this.listeners.notify(key, value);
  }

  remove(key: string): void {
    if (!this.map.delete(key)) return;
    this.listeners.notify(key, null);
  }

  keys(): string[] {
    return [...this.map.keys()];
  }

  subscribe(key: string, listener: KeyValueListener): () => void {
    return this.listeners.subscribe(key, listener);
  }

  subscribeAll(listener: () => void): () => void {
    return this.listeners.subscribeAll(listener);
  }
}
