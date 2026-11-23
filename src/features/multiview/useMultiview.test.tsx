import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Focusable } from '@/core/focus/Focusable';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext } from '@/core/settings/settingsContext';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channel, fakeEngine, type FakeEngine } from '@/features/playback/fixtures.test';
import { BlockGate } from '@/features/playback/gate/blockGate';
import { LAST_CHANNEL_KEY } from '@/features/playback/tune';
import type { MultiviewDeps } from './multiviewDeps';
import { paneFocusId } from './multiviewGrid';
import { channelKey, useMultiview, type MultiviewView } from './useMultiview';

const list = [channel(1), channel(2, { blocked: true }), channel(3)];

function Harness({ deps, seen }: { deps: MultiviewDeps; seen: (view: MultiviewView) => void }): JSX.Element {
  const view = useMultiview(deps);
  seen(view);
  return (
    <FocusScope id="multiview">
      <div data-testid="layer">{view.layer.kind}</div>
      <div data-testid="prompt">{view.prompt?.name ?? ''}</div>
      {view.panes.map((pane) => (
        <Focusable key={pane.id} focusId={paneFocusId(pane.id)} data-testid="pane">
          {pane.channel.name}
        </Focusable>
      ))}
    </FocusScope>
  );
}

async function mount(pin: string | null, lastId: number) {
  const engines: FakeEngine[] = [];
  const store = new MemoryKeyValueStore();
  store.set(LAST_CHANNEL_KEY, String(lastId));
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const parental = new ParentalControls(settings);
  if (pin !== null) await parental.setPin(pin);
  const deps: MultiviewDeps = {
    engines: () => {
      const engine = fakeEngine();
      engines.push(engine);
      return engine;
    },
    gate: new BlockGate(parental),
    store,
    channels: async () => list,
    resolveUrl: (url) => url,
  };
  const navigator = new Navigator({ kind: 'Playback' });
  navigator.push({ kind: 'Multiview' });
  let latest: MultiviewView | null = null;
  const utils = render(
    <SettingsContext value={settings}>
      <NavigatorProvider navigator={navigator}>
        <RemoteKeysProvider onBack={() => undefined}>
          <Harness deps={deps} seen={(view) => (latest = view)} />
        </RemoteKeysProvider>
      </NavigatorProvider>
    </SettingsContext>,
  );
  const view = (): MultiviewView => {
    if (latest === null) throw new Error('not rendered');
    return latest;
  };
  return { engines, navigator, settings, view, ...utils };
}

const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

describe('useMultiview', () => {
  it('starts the entry pane once channels arrive, lands D-pad focus on it, zaps on CH+/- and pops on BACK', async () => {
    const { engines, navigator, settings, view, unmount } = await mount(null, 1);
    await waitFor(() => expect(screen.getAllByTestId('pane')).toHaveLength(1));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('pane')));
    expect(engines[0]?.muted).toBe(false);
    expect(view().channels).toEqual(list);
    press('PageUp');
    expect(view().panes[0]?.channel.id).toBe(2);
    press('PageDown');
    expect(view().panes[0]?.channel.id).toBe(1);
    act(() => settings.set(TellySettings.RESIZE_MODE, 'Zoom'));
    expect(engines[0]?.resizeMode).toBe('Zoom');
    act(() => view().vm.onPaneOk(1));
    expect(screen.getByTestId('layer')).toHaveTextContent('Menu');
    act(() => view().vm.onBack());
    act(() => view().vm.onBack());
    expect(navigator.current.kind).toBe('Playback');
    unmount();
    expect(engines[0]?.release).toHaveBeenCalled();
  });

  it('raises the PIN prompt for a blocked entry pane and only ignores non-channel keys', async () => {
    const { view } = await mount('2468', 2);
    await waitFor(() => expect(screen.getByTestId('prompt')).toHaveTextContent('Channel 2'));
    expect(screen.queryAllByTestId('pane')).toHaveLength(0);
    await act(async () => {
      await view().vm.gate.submit('2468');
    });
    await waitFor(() => expect(screen.getAllByTestId('pane')).toHaveLength(1));
    expect(channelKey({ onChannelKey: vi.fn() }, 'OK')).toBe(false);
  });
});
