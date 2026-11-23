import { describe, expect, it, vi } from 'vitest';
import { digit } from '@/core/input/remoteKeys';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { PipState } from '@/features/pip/pipState';
import { BlockGate } from './gate/blockGate';
import { channel, fakeEngine, tunerOver } from './fixtures.test';
import { playbackNavigationOf } from './menu/menuNavigation';
import { createPlaybackController } from './playbackController';
import { onQuickBarAction } from './quickbar/quickBarActions';

const timers = { set: vi.fn(() => 1 as unknown as ReturnType<typeof setTimeout>), clear: vi.fn() };

async function make(pin: string | null = '2468') {
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  const parental = new ParentalControls(settings);
  if (pin !== null) await parental.setPin(pin);
  const gate = new BlockGate(parental);
  const engine = fakeEngine();
  const channels = [channel(1), channel(2, { blocked: true }), channel(3), channel(12)];
  const tuner = tunerOver(engine, channels, { gate });
  tuner.start();
  const navigator = new Navigator({ kind: 'Playback' });
  const open = vi.fn();
  const pip = new PipState();
  const actions = {
    toggleFavorite: vi.fn(async () => 1),
    hide: vi.fn(async () => 1),
    blockMode: vi.fn(() => 'Enter PIN' as const),
    submitBlockPin: vi.fn(async () => true),
  };
  const ctl = createPlaybackController({
    tuner,
    engine,
    gate,
    parental,
    nav: playbackNavigationOf(navigator, open),
    settings,
    pip,
    actions,
    timers,
    clock: () => 1000,
  });
  return { ctl, tuner, engine, navigator, gate, settings, pip };
}

describe('createPlaybackController', () => {
  it('routes keys through the policy with the settings timeouts and re-seeds the instant', async () => {
    const { ctl, navigator, settings } = await make();
    settings.set(TellySettings.PLAYER_PANEL_TIMEOUT_SEC, 7);
    expect(ctl.onKey('OK')).toBe(true);
    expect(ctl.overlays.value.kind).toBe('Info');
    expect(timers.set).toHaveBeenLastCalledWith(expect.any(Function), 7350);
    expect(ctl.instant.value).toBe(1000);
    expect(ctl.onKey('LEFT')).toBe(false);
    expect(ctl.onKey('BACK')).toBe(true);
    expect(ctl.onKey('BACK')).toBe(true);
    expect(navigator.stack).toEqual([{ kind: 'Guide' }]);
    expect(ctl.onKey('CHANNEL_DOWN')).toBe(true);
    expect(ctl.overlays.value.kind).toBe('ZapInfo');
  });

  it('digit keys tune by channel number; OK commits early and BACK cancels', async () => {
    const { ctl, tuner } = await make();
    expect(ctl.onKey(digit(1))).toBe(true);
    expect(ctl.onKey(digit(2))).toBe(true);
    expect(ctl.entry.digits).toBe('12');
    expect(ctl.onKey('OK')).toBe(true);
    expect(tuner.current?.id).toBe(12);
    expect(ctl.overlays.value.kind).toBe('ZapInfo');
    ctl.onKey(digit(9));
    ctl.onKey(digit(9));
    expect(ctl.onKey('BACK')).toBe(true);
    expect(ctl.entry.digits).toBeNull();
    expect(tuner.current?.id).toBe(12);
    ctl.onKey(digit(7));
    ctl.onKey('OK');
    expect(tuner.current?.id).toBe(12);
    ctl.commands.openPanel();
    expect(ctl.onKey(digit(3))).toBe(false);
  });

  it('a gated tune prompts instead of zapping; the prompt owns every key until it resolves', async () => {
    const { ctl, tuner, gate } = await make();
    ctl.tuneFromPanel(channel(2, { blocked: true }));
    expect(tuner.current?.id).toBe(1);
    expect(gate.prompt?.id).toBe(2);
    expect(ctl.overlays.value.kind).toBe('None');
    expect(ctl.onKey('MENU')).toBe(true);
    expect(ctl.overlays.value.kind).toBe('None');
    expect(await ctl.prompt.submit('2468')).toBe(true);
    expect(tuner.current?.id).toBe(2);
    expect(ctl.overlays.value.kind).toBe('ZapInfo');
    ctl.tuneFromPanel(channel(3));
    expect(tuner.current?.id).toBe(3);
    ctl.commands.execute({ kind: 'Dismiss' });
    ctl.onPanelTuned();
    expect(ctl.overlays.value.kind).toBe('ZapInfo');
    ctl.openChannelMenu(channel(3), 'All channels');
    expect(ctl.overlays.value).toEqual({ kind: 'ChannelMenu', channelId: 3 });
    expect(ctl.menu.menuChannel()?.id).toBe(3);
    ctl.lifecycle.onBackground();
    expect(ctl.lifecycle.current).toBe('Suspended');
  });

  it('quick-bar slots route to the panel, routes, PIP and pickers', async () => {
    const { ctl, engine, navigator } = await make();
    onQuickBarAction(ctl, engine, 'Channels list');
    expect(ctl.overlays.value.kind).toBe('Panel');
    onQuickBarAction(ctl, engine, 'Search');
    onQuickBarAction(ctl, engine, 'Multiview');
    onQuickBarAction(ctl, engine, 'Recordings');
    expect(navigator.stack.map((r) => r.kind)).toEqual(['Playback', 'Search', 'Multiview', 'Recordings']);
    expect(ctl.overlays.value.kind).toBe('None');
    ctl.commands.execute({ kind: 'OpenQuickBar' });
    onQuickBarAction(ctl, engine, 'Picture-in-picture');
    expect(ctl.overlays.value.kind).toBe('None');
    onQuickBarAction(ctl, engine, 'Latency');
    expect(ctl.overlays.value).toMatchObject({ kind: 'TrackPicker', picker: 'Sync' });
    onQuickBarAction(ctl, engine, 'Subtitles');
    expect(ctl.overlays.value).toMatchObject({ kind: 'TrackPicker', picker: 'Subtitles' });
  });
});
