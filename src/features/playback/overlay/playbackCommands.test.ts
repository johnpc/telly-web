import { describe, expect, it, vi } from 'vitest';
import { OverlayState } from './overlayState';
import {
  BACK_TO_PANEL,
  DISMISS,
  EXIT_TO_GUIDE,
  KEEP_ALIVE,
  OPEN_PANEL,
  OPEN_QUICK_BAR,
  PlaybackCommands,
  SHOW_INFO,
  SHOW_TRANSPORT,
  popTo,
  show,
  zap,
} from './playbackCommands';
import { INFO, NONE } from './playbackOverlay';

function make(zaps = true) {
  const timers = { set: vi.fn(() => 1 as unknown as ReturnType<typeof setTimeout>), clear: vi.fn() };
  const overlays = new OverlayState(timers);
  const tuner = { zap: vi.fn(() => zaps) };
  const seams = {
    refreshInstant: vi.fn(),
    exitToGuide: vi.fn(),
    timeouts: () => ({ infoMs: 11, zapMs: 22, quickBarMs: 33 }),
  };
  const commands = new PlaybackCommands(tuner, overlays, seams);
  return { timers, overlays, tuner, seams, commands };
}

describe('PlaybackCommands', () => {
  it('executes every command against the overlay state with the configured timeouts', () => {
    const { timers, commands, seams, overlays } = make();
    commands.execute(SHOW_INFO);
    expect(commands.overlay.kind).toBe('Info');
    expect(timers.set).toHaveBeenLastCalledWith(expect.any(Function), 11);
    expect(seams.refreshInstant).toHaveBeenCalledTimes(1);
    commands.execute(SHOW_TRANSPORT);
    expect(overlays.value.kind).toBe('InfoTransport');
    commands.execute(OPEN_QUICK_BAR);
    expect(timers.set).toHaveBeenLastCalledWith(expect.any(Function), 33);
    commands.execute(OPEN_PANEL);
    expect(overlays.value.kind).toBe('Panel');
    commands.execute(show({ kind: 'ChannelMenu', channelId: 4 }));
    expect(overlays.value).toEqual({ kind: 'ChannelMenu', channelId: 4 });
    commands.execute(BACK_TO_PANEL);
    expect(overlays.value.kind).toBe('Panel');
    commands.execute(popTo(INFO));
    expect(overlays.value).toBe(INFO);
    commands.execute(KEEP_ALIVE);
    commands.execute(DISMISS);
    expect(overlays.value).toBe(NONE);
    commands.execute(EXIT_TO_GUIDE);
    expect(seams.exitToGuide).toHaveBeenCalledTimes(1);
  });

  it('zap shows the compact overlay only when the tuner actually switched', () => {
    const { commands, tuner, timers } = make();
    commands.execute(zap(+1));
    expect(tuner.zap).toHaveBeenCalledWith(1);
    expect(commands.overlay.kind).toBe('ZapInfo');
    expect(timers.set).toHaveBeenLastCalledWith(expect.any(Function), 22);
    const gated = make(false);
    gated.commands.execute(zap(-1));
    expect(gated.commands.overlay).toBe(NONE);
    const bare = new PlaybackCommands({ zap: () => true }, new OverlayState(gated.timers));
    bare.execute(zap(1));
    expect(bare.overlay.kind).toBe('ZapInfo');
    bare.execute(EXIT_TO_GUIDE);
  });
});
