import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '../kv/memoryKeyValueStore';
import {
  SettingsContext,
  createDefaultSettingsRepository,
  defaultSettingsRepository,
} from './settingsContext';
import { SettingsRepository } from './settingsRepository';
import { TellySettings } from './tellySettings';
import { useSetting, useSettingValue } from './useSetting';

describe('useSetting', () => {
  it('reads the live value from the context repository and writes back', () => {
    const repo = new SettingsRepository(new MemoryKeyValueStore());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={repo}>{children}</SettingsContext>
    );
    const { result } = renderHook(() => useSetting(TellySettings.CONFIRM_EXIT), { wrapper });
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(repo.get(TellySettings.CONFIRM_EXIT)).toBe(true);
    act(() => repo.set(TellySettings.CONFIRM_EXIT, false));
    expect(result.current[0]).toBe(false);
  });

  it('useSettingValue tracks an explicit repository', () => {
    const repo = new SettingsRepository(new MemoryKeyValueStore({ appearance_font_size: 'Large' }));
    const { result } = renderHook(() => useSettingValue(repo, TellySettings.FONT_SIZE));
    expect(result.current).toBe('Large');
    act(() => repo.set(TellySettings.FONT_SIZE, 'Small'));
    expect(result.current).toBe('Small');
  });

  it('falls back to the default (localStorage) repository without a provider', () => {
    localStorage.clear();
    const { result } = renderHook(() => useSetting(TellySettings.FONT_SIZE));
    expect(result.current[0]).toBe('Medium');
    act(() => result.current[1]('Large'));
    expect(defaultSettingsRepository.get(TellySettings.FONT_SIZE)).toBe('Large');
    expect(createDefaultSettingsRepository().get(TellySettings.FONT_SIZE)).toBe('Large');
    localStorage.clear();
  });
});
