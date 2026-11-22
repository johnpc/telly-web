import type { KeyValueStore } from '../kv/keyValueStore';
import type { Setting } from './setting';

/** Typed read/write/observe access to every telly setting (Android `SettingsRepository`). */
export class SettingsRepository {
  constructor(private readonly store: KeyValueStore) {}

  get<T>(setting: Setting<T>): T {
    const raw = this.store.get(setting.key);
    return raw === null ? setting.default : setting.decode(raw);
  }

  set<T>(setting: Setting<T>, value: T): void {
    this.store.set(setting.key, setting.encode(value));
  }

  /** Calls `listener` with the decoded value after every write to the key. */
  observe<T>(setting: Setting<T>, listener: (value: T) => void): () => void {
    return this.store.subscribe(setting.key, () => listener(this.get(setting)));
  }

  /** Fires on every settings change; drives the settings rows UI. */
  subscribeChanges(listener: () => void): () => void {
    return this.store.subscribeAll(listener);
  }

  /** Raw write by key, used by pickers and backup restore. */
  writeRaw(key: string, raw: string): void {
    this.store.set(key, raw);
  }

  /** Removes a raw key (playlist URL re-key drops the old-URL copies). */
  removeRaw(key: string): void {
    this.store.remove(key);
  }

  /** The raw persisted map, as exported by backup. */
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.store.keys().map((key) => [key, this.store.get(key) ?? '']));
  }

  /** Replaces persisted values with `values` (backup restore). */
  restore(values: Record<string, string>): void {
    for (const key of this.store.keys()) if (!(key in values)) this.store.remove(key);
    for (const [key, value] of Object.entries(values)) this.store.set(key, value);
  }
}
