import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { PipState } from '@/features/pip/pipState';
import { BlockGate } from '../gate/blockGate';
import { channel, fakeEngine, tunerOver, UTC } from '../fixtures.test';
import { playbackNavigationOf } from '../menu/menuNavigation';
import { createPlaybackController } from '../playbackController';
import { Chrome } from './ChromeScreen';

const press = (key: string): void => {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
};

describe('Chrome', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the active overlay, the pills and the sheet layers off the controller stores', async () => {
    const engine = fakeEngine();
    const tuner = tunerOver(engine, [channel(1, { name: 'News One' }), channel(2)]);
    tuner.start();
    const settings = new SettingsRepository(new MemoryKeyValueStore({ appearance_clock_format: '24-hour' }));
    const navigator = new Navigator({ kind: 'Playback' });
    const ctl = createPlaybackController({
      tuner,
      engine,
      gate: new BlockGate(),
      parental: null,
      nav: playbackNavigationOf(navigator, () => undefined),
      settings,
      pip: new PipState(),
      timers: { set: () => 0 as never, clear: () => undefined },
      clock: () => Date.UTC(2026, 8, 13, 14, 45),
    });
    const session = { engine, tuner, channels: tuner.channels, playing: tuner.playing };
    render(
      <RemoteKeysProvider onBack={() => undefined}>
        <Chrome session={session} ctl={ctl} />
      </RemoteKeysProvider>,
    );
    const chrome = screen.getByTestId('playback-chrome');
    expect(chrome).toHaveAttribute('data-overlay', 'None');
    expect(screen.queryByTestId('zap-wait')).toBeNull();
    act(() => {
      engine.state = { kind: 'Buffering' };
      engine.runway = { ahead: 2.2, need: 6 };
      engine.emit();
    });
    expect(screen.getByTestId('zap-wait-card')).toHaveTextContent('News One');
    expect(screen.getByTestId('runway-label')).toHaveTextContent('Buffering · 2 s of 6 s');
    expect(screen.getByTestId('zap-wait').querySelectorAll('[data-focus-id]')).toHaveLength(0);
    act(() => {
      engine.heldFrame = { kind: 'Held' };
      engine.emit();
    });
    expect(screen.queryByTestId('zap-wait-card')).toBeNull();
    expect(screen.getByTestId('runway-progress')).toBeInTheDocument();
    act(() => {
      engine.state = { kind: 'Playing' };
      engine.emit();
    });
    expect(screen.queryByTestId('zap-wait')).toBeNull();
    act(() => ctl.commands.execute({ kind: 'ShowInfo' }));
    expect(chrome).toHaveAttribute('data-overlay', 'Info');
    expect(screen.getByTestId('info-channel')).toHaveTextContent('1 News One');
    expect(screen.getByText('TV guide')).toBeInTheDocument();
    expect(screen.getByTestId('info-badges')).toHaveTextContent('HD25 FPSMONO');
    act(() => ctl.commands.execute({ kind: 'ShowTransport' }));
    expect(screen.getByTestId('transport-row')).toBeInTheDocument();
    act(() => ctl.commands.execute({ kind: 'OpenQuickBar' }));
    expect(screen.getAllByTestId('quick-bar-label').map((n) => n.textContent)).toEqual([
      'Search',
      'Channels list',
      'Recordings',
      'Multiview',
      'Picture-in-picture',
      '1280 × 720',
      'Mono',
      '0 ms',
      'Off',
    ]);
    act(() =>
      ctl.commands.execute({
        kind: 'Show',
        overlay: { kind: 'TrackPicker', picker: 'Sync', back: { kind: 'None' } },
      }),
    );
    expect(screen.getByText('Audio sync · 0 ms')).toBeInTheDocument();
    act(() =>
      ctl.commands.execute({
        kind: 'Show',
        overlay: { kind: 'ComingSoon', feature: 'Record', back: { kind: 'None' } },
      }),
    );
    expect(screen.getByText('Coming soon to telly')).toBeInTheDocument();
    act(() => ctl.openChannelMenu(channel(1), 'All channels'));
    expect(screen.getByTestId('channel-menu')).toBeInTheDocument();
    expect(screen.getByTestId('channel-panel')).toBeInTheDocument();
    act(() =>
      ctl.commands.execute({
        kind: 'Show',
        overlay: { kind: 'Description', channel: channel(1), back: { kind: 'None' } },
      }),
    );
    expect(screen.getAllByText('No information').length).toBeGreaterThan(0);
    act(() =>
      ctl.commands.execute({
        kind: 'Show',
        overlay: { kind: 'BlockPin', channel: channel(1), mode: 'Set a PIN', back: { kind: 'None' } },
      }),
    );
    expect(screen.getByText('Set a PIN')).toBeInTheDocument();
    press('Escape');
    expect(chrome).toHaveAttribute('data-overlay', 'None');
    act(() => ctl.entry.push(2));
    expect(screen.getByTestId('number-entry')).toHaveTextContent('2');
    ctl.entry.cancel();
    expect(UTC.timeZone).toBe('UTC');
  });
});
