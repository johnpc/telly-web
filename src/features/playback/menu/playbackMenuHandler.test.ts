import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { ChannelBlocker } from '../gate/channelBlocker';
import { channel, fakeEngine, tunerOver } from '../fixtures.test';
import { OverlayState } from '../overlay/overlayState';
import { PlaybackCommands, show } from '../overlay/playbackCommands';
import { NONE, PANEL } from '../overlay/playbackOverlay';
import { playbackNavigationOf } from './menuNavigation';
import { PlaybackMenuHandler } from './playbackMenuHandler';

async function make(pin: string | null = '2468') {
  const parental = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
  if (pin !== null) await parental.setPin(pin);
  const actions = {
    toggleFavorite: vi.fn(async () => undefined),
    hide: vi.fn(async () => undefined),
    toggleBlocked: vi.fn(async () => undefined),
  };
  const tuner = tunerOver(fakeEngine(), [channel(1), channel(2, { favorite: true, groupTitle: null })]);
  tuner.start();
  const commands = new PlaybackCommands(
    tuner,
    new OverlayState({ set: () => 0 as never, clear: () => undefined }),
  );
  const navigator = new Navigator({ kind: 'Playback' });
  const open = vi.fn();
  const nav = playbackNavigationOf(navigator, open);
  const handler = new PlaybackMenuHandler({
    actions,
    blocker: new ChannelBlocker(actions, parental),
    commands,
    tuner,
    nav,
  });
  return { actions, tuner, commands, navigator, open, handler };
}

describe('PlaybackMenuHandler', () => {
  it('resolves the sheet channel and lands persisting rows on the panel', async () => {
    const { handler, actions, commands, tuner } = await make();
    expect(handler.menuChannel()?.id).toBe(1);
    handler.openChannelMenu(2);
    expect(commands.overlay).toEqual({ kind: 'ChannelMenu', channelId: 2 });
    expect(handler.menuChannel()?.id).toBe(2);
    handler.onMenuItem('Add to Favorites');
    expect(actions.toggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(commands.overlay).toBe(PANEL);
    handler.openChannelMenu(1);
    handler.onMenuItem('Hide channel');
    expect(tuner.current?.id).toBe(2);
    expect(actions.hide).toHaveBeenCalledTimes(1);
    handler.openChannelMenu(99);
    expect(handler.menuChannel()?.id).toBe(2);
    commands.execute(show(NONE));
    handler.onMenuItem('Open in external player');
    expect(commands.overlay).toBe(NONE);
  });

  it('navigation rows dismiss the chrome first; pushed rows remember the overlay behind them', async () => {
    const { handler, navigator, open, commands } = await make();
    handler.openChannelMenu(2);
    handler.onMenuItem('Search');
    expect(navigator.current).toEqual({ kind: 'Search' });
    expect(commands.overlay).toBe(NONE);
    handler.onMenuItem('Settings');
    handler.onMenuItem('Manage Favorites');
    handler.openChannelMenu(2);
    handler.onMenuItem('Reorder channels');
    expect(navigator.stack.map((r) => r.kind)).toEqual([
      'Playback',
      'Search',
      'Settings',
      'ManageFavorites',
      'ReorderChannels',
    ]);
    expect(navigator.current).toEqual({ kind: 'ReorderChannels', group: '' });
    handler.openChannelMenu(1);
    handler.onMenuItem('Open in external player');
    expect(open).toHaveBeenCalledWith('http://x/1.ts');
    handler.openChannelMenu(1);
    handler.onMenuItem('Program description');
    expect(commands.overlay).toMatchObject({
      kind: 'Description',
      back: { kind: 'ChannelMenu', channelId: 1 },
    });
    expect(handler.sheetFocus.restore).toBe('Program description');
    handler.openChannelMenu(1);
    handler.onMenuItem('Record');
    expect(commands.overlay).toMatchObject({ kind: 'ComingSoon', feature: 'Record' });
  });

  it('Block channel pushes the PIN dialog; a verified PIN flips the flag and lands on the panel', async () => {
    const { handler, actions, commands } = await make();
    expect(await handler.submitBlockPin('2468')).toBe(false);
    handler.openChannelMenu(1);
    handler.onMenuItem('Block channel');
    expect(commands.overlay).toMatchObject({ kind: 'BlockPin', mode: 'Confirm' });
    expect(await handler.submitBlockPin('0000')).toBe(false);
    expect(commands.overlay.kind).toBe('BlockPin');
    expect(await handler.submitBlockPin('2468')).toBe(true);
    expect(actions.toggleBlocked).toHaveBeenCalledTimes(1);
    expect(commands.overlay).toBe(PANEL);
    const noPin = await make(null);
    noPin.handler.openChannelMenu(1);
    noPin.handler.onMenuItem('Block channel');
    expect(noPin.commands.overlay).toMatchObject({ kind: 'BlockPin', mode: 'Setup' });
    const empty = new PlaybackMenuHandler({
      actions,
      blocker: new ChannelBlocker(actions),
      commands,
      tuner: { byId: () => null, current: null, zapAwayFrom: () => undefined },
      nav: playbackNavigationOf(new Navigator()),
    });
    empty.onMenuItem('Search');
    expect(empty.menuChannel()).toBeNull();
  });

  it('playbackNavigationOf covers every route the player leaves for', () => {
    const navigator = new Navigator({ kind: 'Playback' });
    const nav = playbackNavigationOf(navigator, () => undefined);
    nav.openHistory();
    nav.openMultiview();
    nav.openRecordings();
    expect(navigator.stack.map((r) => r.kind)).toEqual(['Playback', 'History', 'Multiview', 'Recordings']);
    nav.exitToGuide();
    expect(navigator.stack).toEqual([{ kind: 'Guide' }]);
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    playbackNavigationOf(navigator).openExternal('http://x');
    expect(opened).toHaveBeenCalledWith('http://x', '_blank', 'noopener');
    opened.mockRestore();
  });
});
