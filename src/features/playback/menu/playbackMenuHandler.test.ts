import { describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { CustomGroupRepository } from '@/core/db/customGroupRepository';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { type BlockPinMode, ChannelOptionsController, OPTION } from '@/features/channelmenu';
import { createGroupToolStore } from '@/features/groups/groupToolStore';
import { GroupTools } from '@/features/groups/groupTools';
import { freshDb } from '@/test/dbFixtures';
import { channel, fakeEngine, tunerOver } from '../fixtures.test';
import { OverlayState } from '../overlay/overlayState';
import { PlaybackCommands, show } from '../overlay/playbackCommands';
import { NONE, PANEL } from '../overlay/playbackOverlay';
import { playbackNavigationOf } from './menuNavigation';
import { PlaybackMenuHandler } from './playbackMenuHandler';

async function make(pin: string | null = '2468') {
  const db = freshDb();
  const channels = new ChannelRepository(db);
  const parental = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
  if (pin !== null) await parental.setPin(pin);
  const actions = {
    toggleFavorite: vi.fn(async () => 1),
    hide: vi.fn(async () => 1),
    blockMode: vi.fn((): BlockPinMode => (parental.hasPin ? 'Enter PIN' : 'Set a PIN')),
    submitBlockPin: vi.fn(async (entered: string) => entered === '2468'),
  };
  const tuner = tunerOver(fakeEngine(), [channel(1), channel(2, { favorite: true, groupTitle: null })]);
  tuner.start();
  const commands = new PlaybackCommands(
    tuner,
    new OverlayState({ set: () => 0 as never, clear: () => undefined }),
  );
  const navigator = new Navigator({ kind: 'Playback' });
  const open = vi.fn();
  const record = { onRecord: vi.fn(), onCustomRecording: vi.fn() };
  const toggleMyList = vi.fn();
  const handler = new PlaybackMenuHandler({
    actions,
    options: new ChannelOptionsController(channels, () => false),
    groupTools: new GroupTools(createGroupToolStore(new CustomGroupRepository(db), channels), parental),
    commands,
    tuner,
    nav: playbackNavigationOf(navigator, open),
    toggleMyList,
    record,
  });
  return { actions, tuner, commands, navigator, open, handler, record, toggleMyList };
}

describe('PlaybackMenuHandler', () => {
  it('resolves the sheet channel and lands persisting rows on the panel', async () => {
    const { handler, actions, commands, toggleMyList } = await make();
    expect(handler.menuChannel()?.id).toBe(1);
    handler.openChannelMenu(2);
    expect(commands.overlay).toEqual({ kind: 'ChannelMenu', channelId: 2 });
    expect(handler.menuChannel()?.id).toBe(2);
    handler.onMenuItem('Add to Favorites');
    expect(actions.toggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(commands.overlay).toBe(PANEL);
    handler.openChannelMenu(1);
    handler.onMenuItem('Hide channel');
    expect(actions.hide).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    handler.openChannelMenu(1);
    handler.onMenuItem('Add to My list');
    expect(toggleMyList).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(commands.overlay).toBe(PANEL);
    handler.openChannelMenu(99);
    expect(handler.menuChannel()?.id).toBe(1);
    commands.execute(show(NONE));
    handler.onMenuItem('Open in external player');
    expect(commands.overlay).toBe(NONE);
  });

  it('navigation rows dismiss the chrome first; pushed rows remember the overlay behind them', async () => {
    const { handler, navigator, open, commands, record } = await make();
    handler.openChannelMenu(2);
    handler.onMenuItem('Search');
    expect(navigator.current).toEqual({ kind: 'Search' });
    expect(commands.overlay).toBe(NONE);
    handler.onMenuItem('Settings');
    handler.onMenuItem('Manage Favorites');
    handler.openChannelMenu(2, 'News');
    handler.onMenuItem('Reorder channels');
    expect(navigator.stack.map((r) => r.kind)).toEqual([
      'Playback',
      'Search',
      'Settings',
      'ManageFavorites',
      'ReorderChannels',
    ]);
    expect(navigator.current).toEqual({ kind: 'ReorderChannels', group: 'News' });
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
    expect(record.onRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    handler.onMenuItem('Custom recording');
    expect(record.onCustomRecording).toHaveBeenCalledTimes(1);
  });

  it('Block channel pushes the PIN dialog; a verified PIN flips the flag and lands on the panel', async () => {
    const { handler, actions, commands } = await make();
    expect(await handler.submitBlockPin('2468')).toBe(false);
    handler.openChannelMenu(1);
    handler.onMenuItem('Block channel');
    expect(commands.overlay).toMatchObject({ kind: 'BlockPin', mode: 'Enter PIN' });
    expect(await handler.submitBlockPin('0000')).toBe(false);
    expect(commands.overlay.kind).toBe('BlockPin');
    expect(await handler.submitBlockPin('2468')).toBe(true);
    expect(actions.submitBlockPin).toHaveBeenLastCalledWith('2468', 'Enter PIN', 1);
    expect(commands.overlay).toBe(PANEL);
    const noPin = await make(null);
    noPin.handler.openChannelMenu(1);
    noPin.handler.onMenuItem('Block channel');
    expect(noPin.commands.overlay).toMatchObject({ kind: 'BlockPin', mode: 'Set a PIN' });
    const empty = new PlaybackMenuHandler({
      ...handler.deps,
      tuner: { byId: () => null, current: null },
    });
    empty.onMenuItem('Search');
    expect(empty.menuChannel()).toBeNull();
  });

  it('Channel options replaces the sheet; BACK closes a pane dialog first, then lands on the panel', async () => {
    const { handler, commands } = await make();
    handler.closeChannelOptions();
    handler.openChannelMenu(1);
    handler.onMenuItem('Channel options');
    expect(commands.overlay).toEqual({ kind: 'ChannelOptions', channelId: 1, back: PANEL });
    expect(handler.menuChannel()?.id).toBe(1);
    handler.onChannelOption(channel(1), OPTION.NAME);
    expect(handler.options.dialog?.kind).toBe('Rename');
    handler.closeChannelOptions();
    expect(handler.options.dialog).toBeNull();
    expect(commands.overlay.kind).toBe('ChannelOptions');
    handler.onChannelOption(channel(1), OPTION.BLOCK);
    expect(commands.overlay).toMatchObject({ kind: 'BlockPin', back: { kind: 'ChannelOptions' } });
    expect(await handler.submitBlockPin('2468')).toBe(true);
    expect(commands.overlay).toBe(PANEL);
    handler.onMenuItem('Channel options');
    handler.closeChannelOptions();
    expect(commands.overlay).toBe(PANEL);
  });

  it('group tools push over the sheet in the panel group and land on the panel when done', async () => {
    const { handler, commands } = await make();
    handler.openChannelMenu(1, 'News');
    handler.setCustomGroups([]);
    handler.onMenuItem('Create group');
    const tool = commands.overlay;
    if (tool.kind !== 'GroupTool') throw new Error('expected a tool overlay');
    expect(tool.back).toEqual({ kind: 'ChannelMenu', channelId: 1 });
    expect(handler.sheetFocus.restore).toBe('Create group');
    tool.session.submitText('Picks');
    await vi.waitFor(() => expect(commands.overlay).toBe(PANEL));
    handler.openChannelMenu(1, 'News');
    handler.onMenuItem('Group options');
    const options = commands.overlay;
    if (options.kind !== 'GroupTool') throw new Error('expected a tool overlay');
    expect(options.session.ui({ channels: [], groups: [], epgIds: [] }).title).toBe('News');
    expect(handler.customGroups).toEqual([]);
  });

  it('playbackNavigationOf covers every route the player leaves for', () => {
    const navigator = new Navigator({ kind: 'Playback' });
    const nav = playbackNavigationOf(navigator, () => undefined);
    nav.openHistory();
    nav.openMultiview();
    nav.openRecordings();
    nav.openSearch();
    nav.open({ kind: 'ChannelNamesEditor' });
    expect(navigator.stack.map((r) => r.kind)).toEqual([
      'Playback',
      'History',
      'Multiview',
      'Recordings',
      'Search',
      'ChannelNamesEditor',
    ]);
    nav.exitToGuide();
    expect(navigator.stack).toEqual([{ kind: 'Guide' }]);
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    playbackNavigationOf(navigator).openExternal('http://x');
    expect(opened).toHaveBeenCalledWith('http://x', '_blank', 'noopener');
    opened.mockRestore();
  });
});
