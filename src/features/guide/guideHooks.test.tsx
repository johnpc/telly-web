import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDepsContext } from '@/app/appContext';
import { StartRoute } from '@/app/startRoute';
import { ProgramRepository } from '@/core/db/programRepository';
import { FocusEngine } from '@/core/focus/focusEngine';
import { KeyRouter } from '@/core/input/keyRouter';
import { KeyRouterContext } from '@/core/input/keyRouterContext';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorContext } from '@/core/navigation/navigatorContext';
import type { PlayerEngine } from '@/core/player';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { PlaybackSession } from '@/features/playback/tune';
import { LAST_CHANNEL_KEY, TuneController } from '@/features/playback/tune';
import { programImport } from '@/test/dbFixtures';
import { HINT_HIDE_AFTER_MS, HINT_KEY } from './guideHint';
import { GROUP_KEY } from './guideGroupMemory';
import { GEAR_ID } from './guideKeyRouting';
import { GROUPS } from './guideLayer';
import { makeHarness } from './testHarness';
import { useGuideController } from './useGuideController';
import { useGuideHint } from './useGuideHint';
import { useGuideKeys } from './useGuideKeys';
import { useGuideNow } from './useGuideNow';
import { useGuideRows } from './useGuideRows';
import { useGuideStyle } from './useGuideStyle';
import { KeyQueue } from './keyQueue';
import { ORIGIN, channel as fixtureChannel, row } from './testFixtures';

function session(tuner: TuneController): PlaybackSession {
  return { engine: {} as PlayerEngine, tuner, channels: tuner.channels, playing: null };
}

describe('useGuideController', () => {
  it('builds one controller, claims the start decision and resumes the stored preview', () => {
    const engine = { load: vi.fn(), stop: vi.fn() } as unknown as PlayerEngine;
    const store = new MemoryKeyValueStore({ [LAST_CHANNEL_KEY]: '2' });
    const tuner = new TuneController({ engine, store, recordWatch: async () => undefined });
    tuner.setChannels([fixtureChannel(1), fixtureChannel(2)]);
    const startRoute = new StartRoute();
    startRoute.decide(2);
    const navigator = new Navigator({ kind: 'Guide' });
    const { result, rerender } = renderHook(() => useGuideController(session(tuner)), {
      wrapper: ({ children }) => (
        <NavigatorContext value={navigator}>
          <SettingsContext value={new SettingsRepository(new MemoryKeyValueStore())}>
            <AppDepsContext value={{ startRoute }}>{children}</AppDepsContext>
          </SettingsContext>
        </NavigatorContext>
      ),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(tuner.current?.id).toBe(2);
    expect(engine.load).toHaveBeenCalledTimes(1);
  });
});

describe('useGuideRows', () => {
  it('feeds the controller rows for the selected group off the live programme window', async () => {
    const harness = await makeHarness();
    const programs = new ProgramRepository(harness.db);
    await programs.replaceFor(
      ['news-one.id'],
      [programImport('news-one.id', ORIGIN, ORIGIN + 3_600_000, 'Headlines')],
    );
    const channels = await harness.channels.visible();
    harness.deps.store.set(GROUP_KEY, 'Gone');
    const controller = harness.controller;
    const { result } = renderHook(() =>
      useGuideRows(controller, channels, [], { programs, channels: harness.channels }),
    );
    await vi.waitFor(() => expect(result.current).toHaveLength(3));
    expect(controller.selectedGroup).toBe('All channels');
    await vi.waitFor(() =>
      expect(result.current[0]?.cells.some((c) => c.program?.title === 'Headlines')).toBe(true),
    );
    expect(controller.engine.focus?.rowIndex).toBe(0);
  });
});

describe('useGuideNow / useGuideHint / useGuideStyle', () => {
  afterEach(() => vi.useRealTimers());
  it('re-samples now on the minute and on visibility', async () => {
    const harness = await makeHarness();
    vi.useFakeTimers();
    let clock = ORIGIN + 10_000;
    renderHook(() => useGuideNow(harness.controller, () => clock));
    clock = ORIGIN + 70_000;
    act(() => vi.advanceTimersByTime(60_000));
    expect(harness.controller.now).toBe(ORIGIN + 70_000);
    clock = ORIGIN + 90_000;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(harness.controller.now).toBe(ORIGIN + 90_000);
    const live = renderHook(() => useGuideNow(harness.controller));
    live.unmount();
  });
  it('shows the hint once and hides it after the window', () => {
    vi.useFakeTimers();
    const store = new MemoryKeyValueStore();
    const { result } = renderHook(() => useGuideHint(store));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(HINT_HIDE_AFTER_MS));
    expect(result.current).toBe(false);
    expect(store.get(HINT_KEY)).toBe('1');
    expect(renderHook(() => useGuideHint(store)).result.current).toBe(false);
  });
  it('reads the appearance style live', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const { result } = renderHook(() => useGuideStyle(), {
      wrapper: ({ children }) => <SettingsContext value={settings}>{children}</SettingsContext>,
    });
    expect(result.current.visibleRows).toBe(7);
    act(() => settings.set(TellySettings.GUIDE_VISIBLE_CHANNELS, 10));
    expect(result.current.visibleRows).toBe(10);
  });
});

describe('useGuideKeys', () => {
  it('parks keys until the first rows land, then routes them through the controller', async () => {
    const harness = await makeHarness();
    const router = new KeyRouter({ moveFocus: () => false, activate: () => false, back: () => undefined });
    const queue = new KeyQueue();
    function Probe(): null {
      useGuideKeys(harness.controller, queue);
      return null;
    }
    render(
      <KeyRouterContext value={router}>
        <Probe />
      </KeyRouterContext>,
    );
    expect(router.depth).toBe(1);
    expect(router.dispatch('UP')).toBe(true);
    expect(queue.size).toBe(1);
    expect(harness.controller.loaded).toBe(false);
    harness.controller.setRows([row(fixtureChannel(1), ORIGIN, 2)]);
    expect(harness.controller.loaded).toBe(true);
    expect(router.dispatch('BACK')).toBe(true);
    expect(harness.controller.layer.kind).toBe('Groups');
    expect(router.dispatch('BACK')).toBe(true);
    expect(screen.queryByText('nothing')).toBeNull();
  });
  it('on the rail BACK exits unless the confirm toggle arms the warning first', async () => {
    const harness = await makeHarness();
    const focus = new FocusEngine();
    focus.register(GEAR_ID, 'app', document.createElement('button'));
    focus.focus(GEAR_ID);
    const back = vi.fn();
    const router = new KeyRouter({ moveFocus: () => false, activate: () => false, back });
    harness.controller.setRows([]);
    function Probe(): null {
      useGuideKeys(harness.controller, new KeyQueue(), focus);
      return null;
    }
    render(
      <KeyRouterContext value={router}>
        <Probe />
      </KeyRouterContext>,
    );
    harness.controller.menu.show(GROUPS);
    router.dispatch('BACK');
    expect(back).toHaveBeenCalledTimes(1);
    harness.deps.settings.set(TellySettings.CONFIRM_EXIT, true);
    router.dispatch('BACK');
    expect(back).toHaveBeenCalledTimes(1);
    expect(harness.controller.exit.warning).toBe(true);
    router.dispatch('BACK');
    expect(back).toHaveBeenCalledTimes(2);
  });
});
