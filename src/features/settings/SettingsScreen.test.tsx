import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playlistRepository } from '@/core/db/playlistRepository';
import { tellyDb } from '@/core/db/tellyDb';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { channelImport } from '@/test/dbFixtures';
import { SettingsScreen } from './SettingsScreen';

const URL = 'http://p/list.m3u';
const settle = (): Promise<void> => act(async () => undefined);
const press = async (key: string): Promise<void> => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
  await settle();
};
const focusable = (text: string): HTMLElement =>
  screen.getByText(text).closest('[data-focus-id]') as HTMLElement;
const focusRow = async (text: string): Promise<void> => {
  const node = focusable(text);
  await act(async () => node.focus());
};
const select = async (text: string): Promise<void> => {
  await focusRow(text);
  await press('Enter');
};

function Harness({
  settings,
  navigator,
}: {
  settings: SettingsRepository;
  navigator: Navigator;
}): JSX.Element {
  return (
    <SettingsContext value={settings}>
      <NavigatorProvider navigator={navigator}>
        <RemoteKeysProvider onBack={() => navigator.pop()}>
          <SettingsScreen />
        </RemoteKeysProvider>
      </NavigatorProvider>
    </SettingsContext>
  );
}

describe('SettingsScreen', () => {
  let settings: SettingsRepository;
  let navigator: Navigator;

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn();
    await tellyDb.delete();
    await tellyDb.open();
    await playlistRepository.add(
      URL,
      { epgUrl: null, channels: [channelImport('News One')], vodItems: [] },
      'P',
      () => 1,
    );
    settings = new SettingsRepository(new MemoryKeyValueStore());
    navigator = new Navigator({ kind: 'Guide' });
    navigator.push({ kind: 'Settings' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists the sections, toggles a row, picks an option and pops back one sheet at a time', async () => {
    render(<Harness settings={settings} navigator={navigator} />);
    await settle();
    expect(focusable('General')).toHaveFocus();
    await select('General');
    expect(screen.getByRole('heading')).toHaveTextContent('General');
    await select('Confirm exit by second press Back');
    expect(settings.get(TellySettings.CONFIRM_EXIT)).toBe(true);
    expect(screen.getByRole('switch', { name: /Confirm exit/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Auto start app on boot').closest('[aria-disabled]')).not.toBeNull();
    await press('Escape');
    await select('EPG');
    await select('Update interval, hours');
    expect(focusable('None')).toHaveFocus();
    await select('6');
    expect(settings.get(TellySettings.EPG_UPDATE_INTERVAL_HOURS)).toBe(6);
    expect(focusable('Update interval, hours')).toHaveFocus();
    await press('Escape');
    await press('Escape');
    expect(navigator.current).toEqual({ kind: 'Guide' });
  });

  it('edits a playlist name through the text editor and reports a manual refresh', async () => {
    render(<Harness settings={settings} navigator={navigator} />);
    await settle();
    await select('Playlists');
    await waitFor(() => expect(screen.getByText('Channels: 1')).toBeInTheDocument());
    await select('P');
    await select('Playlist name');
    const input = screen.getByTestId('settings-text-edit') as HTMLInputElement;
    expect(input).toHaveFocus();
    await press('ArrowLeft');
    fireEvent.change(input, { target: { value: 'Living room' } });
    await press('Enter');
    await waitFor(() => expect(screen.getByRole('heading')).toHaveTextContent('Living room'));
    await select('Update playlist');
    await waitFor(() =>
      expect(screen.getByTestId('settings-toast')).toHaveTextContent('Playlist update failed'),
    );
    await select('Delete playlist');
    expect(screen.getByText('Delete playlist?')).toBeInTheDocument();
    expect(focusable('Delete')).toHaveFocus();
    await select('Cancel');
    expect(screen.getByRole('heading')).toHaveTextContent('Living room');
  });

  it('arms parental controls only when the PIN wheel commits, then gates Settings behind it', async () => {
    const { unmount } = render(<Harness settings={settings} navigator={navigator} />);
    await settle();
    await select('Parental controls');
    await select('Off');
    expect(screen.getByRole('heading')).toHaveTextContent('Change PIN');
    await press('Escape');
    expect(screen.getByText('Off')).toBeInTheDocument();
    await select('Off');
    await press('ArrowUp');
    await press('ArrowUp');
    await press('ArrowRight');
    await press('ArrowDown');
    expect(screen.getByTestId('pin-wheel')).toHaveTextContent('2900');
    await press('Enter');
    await waitFor(() => expect(settings.get(TellySettings.PARENTAL_ENABLED)).toBe(true));
    await select('Settings');
    unmount();
    const second = new Navigator({ kind: 'Guide' });
    second.push({ kind: 'Settings' });
    render(<Harness settings={settings} navigator={second} />);
    await settle();
    expect(screen.getByRole('heading')).toHaveTextContent('Enter PIN');
    await press('Enter');
    expect(screen.getByRole('heading')).toHaveTextContent('Enter PIN');
    await press('Escape');
    expect(second.current).toEqual({ kind: 'Guide' });
  });

  it('uses the masked keyboard entry when the PIN input method is Keyboard', async () => {
    settings.set(TellySettings.PARENTAL_PIN_INPUT_METHOD, 'Keyboard');
    render(<Harness settings={settings} navigator={navigator} />);
    await settle();
    await select('Parental controls');
    await select('Change PIN');
    const input = screen.getByTestId('pin-keyboard') as HTMLInputElement;
    expect(input).toHaveFocus();
    await press('ArrowLeft');
    fireEvent.change(input, { target: { value: '24x6' } });
    expect(input.value).toBe('246');
    fireEvent.change(input, { target: { value: '2468' } });
    await waitFor(() => expect(settings.get(TellySettings.PARENTAL_PIN_HASH)).not.toBe(''));
    await select('Change PIN');
    fireEvent.change(screen.getByTestId('pin-keyboard'), { target: { value: '1' } });
    await press('Enter');
    await waitFor(() => expect(screen.queryByTestId('pin-keyboard')).toBeNull());
  });
});
