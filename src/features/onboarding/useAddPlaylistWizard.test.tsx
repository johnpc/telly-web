import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { type Mock, describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import type { WizardDeps } from './addPlaylistViewModel';
import { finishEpg } from './addPlaylistEpg';
import { useAddPlaylistWizard } from './useAddPlaylistWizard';

const body = '#EXTM3U\n#EXTINF:-1,News One\nhttp://h/1.ts\n';

function setup(): {
  navigator: Navigator;
  wrapper: ({ children }: { children: ReactNode }) => ReactNode;
  deps: WizardDeps;
  onSaved: Mock<(settings: SettingsRepository) => void>;
} {
  const navigator = new Navigator({ kind: 'Welcome' });
  navigator.push({ kind: 'AddPlaylistWizard' });
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const deps: WizardDeps = {
    fetchPlaylist: () => Promise.resolve(body),
    persist: vi.fn(() => Promise.resolve()),
  };
  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <SettingsContext value={settings}>
      <NavigatorProvider navigator={navigator}>{children}</NavigatorProvider>
    </SettingsContext>
  );
  const onSaved: Mock<(settings: SettingsRepository) => void> = vi.fn((): void => undefined);
  return { navigator, wrapper, deps, onSaved };
}

describe('useAddPlaylistWizard', () => {
  it('exit walks back one step, then pops the route', async () => {
    const { navigator, wrapper, deps, onSaved } = setup();
    const { result } = renderHook(() => useAddPlaylistWizard({ depsFor: () => deps, onSaved }), { wrapper });
    act(() => result.current.vm.chooseType('M3U'));
    expect(result.current.state.step).toBe('URL_ENTRY');
    act(() => result.current.exit());
    expect(result.current.state.step).toBe('TYPE_CHOOSER');
    expect(navigator.current).toEqual({ kind: 'AddPlaylistWizard' });
    act(() => result.current.exit());
    expect(navigator.current).toEqual({ kind: 'Welcome' });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('DONE kicks the EPG refresh and makes fullscreen playback the root', async () => {
    const { navigator, wrapper, deps, onSaved } = setup();
    const { result } = renderHook(() => useAddPlaylistWizard({ depsFor: () => deps, onSaved }), { wrapper });
    act(() => {
      result.current.vm.chooseType('M3U');
      result.current.vm.setUrl('http://h/p.m3u');
      result.current.vm.submitUrl();
    });
    await act(async () => undefined);
    act(() => result.current.vm.confirm());
    await act(() => finishEpg(result.current.vm));
    expect(result.current.state.step).toBe('DONE');
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(navigator.stack).toEqual([{ kind: 'Playback' }]);
  });
});
