import { useCallback, useSyncExternalStore } from 'react';
import type { Setting } from './setting';
import type { SettingsRepository } from './settingsRepository';
import { useSettingsRepository } from './settingsContext';

/** The live decoded value of one setting from `repository` (Android `flow(setting)`). */
export function useSettingValue<T>(repository: SettingsRepository, setting: Setting<T>): T {
  const subscribe = useCallback(
    (onChange: () => void) => repository.observe(setting, onChange),
    [repository, setting],
  );
  const read = useCallback(() => repository.get(setting), [repository, setting]);
  return useSyncExternalStore(subscribe, read, read);
}

/** `[value, setValue]` for one setting over the context repository. */
export function useSetting<T>(setting: Setting<T>): [T, (value: T) => void] {
  const repository = useSettingsRepository();
  const value = useSettingValue(repository, setting);
  const setValue = useCallback((next: T) => repository.set(setting, next), [repository, setting]);
  return [value, setValue];
}
