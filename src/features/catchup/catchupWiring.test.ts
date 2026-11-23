import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { PlayerEngine } from '@/core/player';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { OverlayState } from '@/features/playback/overlay/overlayState';
import { PlaybackCommands } from '@/features/playback/overlay/playbackCommands';
import { TuneController } from '@/features/playback/tune';
import { CatchupSession } from './catchupSession';
import { createCatchupPlayback } from './catchupWiring';
import { HOUR, NOW, channelRow, request } from './testFixtures';

describe('createCatchupPlayback', () => {
  it('wires the mode to the overlay commands, the live settings and the session', () => {
    const engine = {
      load: vi.fn(),
      stop: vi.fn(),
      seekTo: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      paused: false,
      positionMs: 0,
      state: { kind: 'Idle' },
      subscribe: () => () => undefined,
    } as unknown as PlayerEngine;
    const tuner = new TuneController({
      engine,
      store: new MemoryKeyValueStore(),
      recordWatch: async () => undefined,
    });
    const channel = channelRow(1);
    tuner.setChannels([channel]);
    const timers = { set: vi.fn(() => 1 as unknown as ReturnType<typeof setTimeout>), clear: vi.fn() };
    const overlays = new OverlayState(timers);
    const commands = new PlaybackCommands(tuner, overlays);
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(TellySettings.SKIP_STEPS, '5s / 15s / 30s / 1m');
    const session = new CatchupSession();
    const exitToGuide = vi.fn();
    const catchup = createCatchupPlayback({ engine, tuner, commands, exitToGuide, settings, session });
    expect(catchup.skip()).toEqual({ backMs: 5_000, forwardMs: 15_000 });
    session.set(request(channel, NOW - 2 * HOUR, NOW - HOUR));
    expect(catchup.resumePending()).toBe(true);
    expect(overlays.value.kind).toBe('InfoTransport');
    expect(timers.set).toHaveBeenCalledTimes(1);
    catchup.pause.toggle();
    expect(timers.clear).toHaveBeenCalledTimes(1);
    expect(overlays.value.kind).toBe('InfoTransport');
    catchup.onKey({ kind: 'None' }, 'BACK');
    expect(exitToGuide).toHaveBeenCalledTimes(1);
    const production = createCatchupPlayback({ engine, tuner, commands, exitToGuide, settings });
    expect(production.deps.clock()).toBeGreaterThan(0);
    expect(production.deps.seekKeys().rwFf).toBe(true);
  });
});
