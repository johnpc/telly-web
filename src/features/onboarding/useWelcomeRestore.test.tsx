import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import type { RestoreHooks } from './restoreRunner';
import { useWelcomeRestore } from './useWelcomeRestore';

function setup(overrides: Partial<RestoreHooks>): {
  navigator: Navigator;
  result: { current: ReturnType<typeof useWelcomeRestore> };
} {
  const navigator = new Navigator({ kind: 'Welcome' });
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <SettingsContext value={settings}>
      <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
    </SettingsContext>
  );
  const { result } = renderHook(() => useWelcomeRestore(overrides), { wrapper });
  return { navigator, result };
}

describe('useWelcomeRestore', () => {
  it('uses the production probe by default: no OPFS in jsdom means no offer', async () => {
    const { result } = setup({});
    await act(async () => undefined);
    expect(result.current.offer).toEqual({ kind: 'None' });
  });

  it('a Ready offer restores through the backup importer and lands per the cold-start policy', async () => {
    const land = vi.fn();
    const { result } = setup({ probe: () => Promise.resolve({ kind: 'Ready', json: 'not a backup' }), land });
    await act(async () => undefined);
    act(() => result.current.activate());
    await act(async () => undefined);
    expect(result.current.busy).toBe(false);
    expect(land).not.toHaveBeenCalled();
  });

  it('the default landing re-decides the start route from the channel count', async () => {
    const { navigator, result } = setup({
      probe: () => Promise.resolve({ kind: 'Ready', json: '{}' }),
      restore: () => Promise.resolve(true),
    });
    await act(async () => undefined);
    act(() => result.current.activate());
    await vi.waitFor(() => expect(navigator.stack).toEqual([{ kind: 'Welcome' }]));
  });
});
