import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Setting } from './setting';
import type { SettingsRepository } from './settingsRepository';
import { useSettingsRepository } from './settingsContext';

/**
 * Decodes a setting once per raw string: `stringSetSetting` decodes to a fresh
 * Set on every read, and `useSyncExternalStore` needs a referentially stable
 * snapshot while the stored value is unchanged.
 */
interface Decoded<T> {
  raw: string | null;
  value: T;
}

interface DecodedCache<T> {
  entry: Decoded<T> | null;
}

function decodedReader<T>(repository: SettingsRepository, setting: Setting<T>): () => T {
  const cache: DecodedCache<T> = { entry: null };
  return () => readDecoded(repository, setting, cache);
}

function readDecoded<T>(repository: SettingsRepository, setting: Setting<T>, cache: DecodedCache<T>): T {
  const raw = repository.raw(setting.key);
  const stale = cache.entry?.raw !== raw;
  if (stale) cache.entry = { raw, value: repository.get(setting) };
  return (cache.entry as Decoded<T>).value;
}

/** The live decoded value of one setting from `repository` (Android `flow(setting)`). */
export function useSettingValue<T>(repository: SettingsRepository, setting: Setting<T>): T {
  const subscribe = useCallback(
    (onChange: () => void) => repository.observe(setting, onChange),
    [repository, setting],
  );
  const read = useMemo(() => decodedReader(repository, setting), [repository, setting]);
  return useSyncExternalStore(subscribe, read, read);
}

/** `[value, setValue]` for one setting over the context repository. */
export function useSetting<T>(setting: Setting<T>): [T, (value: T) => void] {
  const repository = useSettingsRepository();
  const value = useSettingValue(repository, setting);
  const setValue = useCallback((next: T) => repository.set(setting, next), [repository, setting]);
  return [value, setValue];
}
