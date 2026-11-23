import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { ParentalControls } from '@/core/settings/parentalControls';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { channel, fakeEngine } from '@/features/playback/fixtures.test';
import { BlockGate } from '@/features/playback/gate/blockGate';
import { LAST_CHANNEL_KEY } from '@/features/playback/tune';
import { MultiviewPanes } from './multiviewPanes';
import { MultiviewTuneGate } from './multiviewTuneGate';
import { MultiviewViewModel } from './multiviewViewModel';

const list = [channel(1), channel(2, { blocked: true }), channel(3)];

async function setup(lastId: number | null, pin: string | null = null) {
  const store = new MemoryKeyValueStore();
  if (lastId !== null) store.set(LAST_CHANNEL_KEY, String(lastId));
  const parental = new ParentalControls(new SettingsRepository(new MemoryKeyValueStore()));
  if (pin !== null) await parental.setPin(pin);
  const onExit = vi.fn();
  const vm = new MultiviewViewModel({
    panes: new MultiviewPanes(fakeEngine),
    gate: new MultiviewTuneGate(new BlockGate(parental)),
    store,
    onExit,
  });
  return { vm, store, onExit };
}

describe('MultiviewViewModel', () => {
  it('starts on the last-watched channel once the list arrives, and only once', async () => {
    const { vm } = await setup(3);
    vm.start();
    expect(vm.panes.panes).toHaveLength(0);
    vm.setChannels(list);
    vm.start();
    vm.start();
    expect(vm.panes.panes.map((p) => p.channel.id)).toEqual([3]);
    expect(vm.layer).toEqual({ kind: 'Panes' });
  });

  it('OK opens the menu, Add fills a pane via the picker, Change retunes, Remove collapses, BACK walks back', async () => {
    const { vm, store, onExit } = await setup(null);
    const layers = vi.fn();
    vm.subscribe(layers);
    vm.setChannels(list);
    vm.start();
    expect(vm.panes.focused?.channel.id).toBe(1);
    vm.onPick(channel(3));
    expect(vm.panes.panes).toHaveLength(1);
    vm.onPaneOk(1);
    expect(vm.layer).toEqual({ kind: 'Menu' });
    expect(vm.menuRows()).toEqual(['ADD_SCREEN', 'SEARCH_AND_ADD', 'CHANGE_CHANNEL']);
    vm.onMenuAction('SEARCH_AND_ADD');
    expect(vm.layer).toEqual({ kind: 'Picker', mode: 'ADD' });
    vm.onPick(channel(3));
    expect(vm.panes.panes.map((p) => p.channel.id)).toEqual([1, 3]);
    expect(vm.layer).toEqual({ kind: 'Panes' });
    vm.onPaneOk(1);
    vm.onMenuAction('CHANGE_CHANNEL');
    vm.onPick(channel(1));
    expect(vm.panes.panes.map((p) => p.channel.id)).toEqual([1, 3]);
    vm.onPaneOk(2);
    expect(vm.menuRows()).toContain('REMOVE_SCREEN');
    vm.onMenuAction('REMOVE_SCREEN');
    expect(vm.panes.panes.map((p) => p.channel.id)).toEqual([1]);
    vm.onPaneOk(1);
    vm.onMenuAction('ADD_SCREEN');
    vm.onBack();
    expect(vm.layer).toEqual({ kind: 'Panes' });
    vm.onBack();
    expect(store.get(LAST_CHANNEL_KEY)).toBe('1');
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(layers).toHaveBeenCalled();
  });

  it('CH+/- zap the focused pane in place on the panes layer only, wrapping', async () => {
    const { vm } = await setup(1);
    vm.setChannels(list);
    vm.start();
    vm.onChannelKey(-1);
    expect(vm.panes.focused?.channel.id).toBe(3);
    vm.onChannelKey(+1);
    expect(vm.panes.focused?.channel.id).toBe(1);
    vm.onPaneOk(1);
    vm.onChannelKey(+1);
    expect(vm.panes.focused?.channel.id).toBe(1);
  });

  it('gates every tune path behind the PIN: entry pane, picks and zaps; wrong or cancelled PINs never tune', async () => {
    const { vm, onExit } = await setup(2, '2468');
    vm.setChannels(list);
    vm.start();
    expect(vm.gate.promptOpen).toBe(true);
    expect(vm.panes.panes).toHaveLength(0);
    vm.onChannelKey(+1);
    vm.onBack();
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(vm.panes.panes).toHaveLength(0);
    vm.onPick(channel(1));
    expect(vm.panes.panes).toHaveLength(0);
    vm.setChannels([channel(1), channel(2, { blocked: true })]);
    vm.onChannelKey(+1);
    expect(vm.panes.panes).toHaveLength(0);
    const fresh = await setup(1, '2468');
    fresh.vm.setChannels(list);
    fresh.vm.start();
    fresh.vm.onPaneOk(1);
    fresh.vm.onMenuAction('ADD_SCREEN');
    fresh.vm.onPick(channel(2, { blocked: true }));
    expect(fresh.vm.gate.promptOpen).toBe(true);
    fresh.vm.onPick(channel(3));
    expect(fresh.vm.panes.panes).toHaveLength(1);
    expect(await fresh.vm.gate.submit('0000')).toBe(false);
    expect(fresh.vm.panes.panes).toHaveLength(1);
    expect(await fresh.vm.gate.submit('2468')).toBe(true);
    expect(fresh.vm.panes.panes.map((p) => p.channel.id)).toEqual([1, 2]);
    expect(fresh.vm.layer).toEqual({ kind: 'Panes' });
    fresh.vm.onChannelKey(-1);
    expect(fresh.vm.gate.promptOpen).toBe(false);
    expect(fresh.vm.panes.focused?.channel.id).toBe(1);
    fresh.vm.onChannelKey(+1);
    expect(fresh.vm.gate.promptOpen).toBe(true);
    fresh.vm.onBack();
    expect(fresh.vm.panes.panes).toHaveLength(2);
    expect(fresh.onExit).not.toHaveBeenCalled();
    fresh.vm.close();
    expect(fresh.vm.panes.panes).toHaveLength(0);
  });
});
