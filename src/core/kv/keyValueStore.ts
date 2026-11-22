/**
 * Tiny persistent key-value seam (port of the Android `core/kv` +
 * `core/settings/KeyValueStore`). Values are strings; `SettingsRepository`
 * adds the typing. Logic depends on this interface; tests inject the
 * in-memory implementation, production uses `localStorage`.
 */
export type KeyValueListener = (value: string | null) => void;

export interface KeyValueStore {
  /** The stored value, or null when the key is absent. */
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Every stored key (the backup snapshot walks them). */
  keys(): string[];
  /** Fires after every write to `key` with the new value (null = removed). */
  subscribe(key: string, listener: KeyValueListener): () => void;
  /** Fires after ANY write; drives the settings rows UI (Android `snapshots`). */
  subscribeAll(listener: () => void): () => void;
}
