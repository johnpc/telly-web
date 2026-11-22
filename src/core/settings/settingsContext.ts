import { createContext, useContext } from 'react';
import { LocalStorageKeyValueStore } from '../kv/localStorageKeyValueStore';
import { MemoryKeyValueStore } from '../kv/memoryKeyValueStore';
import { SettingsRepository } from './settingsRepository';

/** The production repository: `localStorage` when a window exists, memory otherwise (SSR/tests). */
export function createDefaultSettingsRepository(): SettingsRepository {
  const store = typeof window === 'undefined' ? new MemoryKeyValueStore() : new LocalStorageKeyValueStore();
  return new SettingsRepository(store);
}

export const defaultSettingsRepository: SettingsRepository = createDefaultSettingsRepository();

/** Provide a test/preview repository with `<SettingsContext value={repo}>`. */
export const SettingsContext = createContext<SettingsRepository>(defaultSettingsRepository);

export function useSettingsRepository(): SettingsRepository {
  return useContext(SettingsContext);
}
