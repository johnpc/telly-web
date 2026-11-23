import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { useBackgroundRefresh } from './useBackgroundRefresh';

describe('useBackgroundRefresh', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
  afterEach(() => vi.useRealTimers());

  it('keeps exactly one live ticker across StrictMode re-runs and clears it on unmount', () => {
    const setSpy = vi.spyOn(window, 'setInterval');
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <SettingsContext value={settings}>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </SettingsContext>
      </StrictMode>
    );
    const { unmount } = renderHook(() => useBackgroundRefresh(), { wrapper });
    // StrictMode mounts, unmounts and re-mounts the effect: two intervals created, one cleared.
    expect(setSpy.mock.calls.length - clearSpy.mock.calls.length).toBe(1);
    unmount();
    expect(setSpy.mock.calls.length).toBe(clearSpy.mock.calls.length);
  });
});
