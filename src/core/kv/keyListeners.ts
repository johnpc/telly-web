import type { KeyValueListener } from './keyValueStore';

/** The listener bookkeeping both store implementations share. */
export class KeyListeners {
  private readonly byKey = new Map<string, Set<KeyValueListener>>();
  private readonly all = new Set<() => void>();

  subscribe(key: string, listener: KeyValueListener): () => void {
    const set = this.byKey.get(key) ?? new Set<KeyValueListener>();
    set.add(listener);
    this.byKey.set(key, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.byKey.delete(key);
    };
  }

  subscribeAll(listener: () => void): () => void {
    this.all.add(listener);
    return () => {
      this.all.delete(listener);
    };
  }

  notify(key: string, value: string | null): void {
    this.byKey.get(key)?.forEach((listener) => listener(value));
    this.all.forEach((listener) => listener());
  }
}
