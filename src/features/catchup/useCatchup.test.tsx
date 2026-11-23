import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FocusEngine } from '@/core/focus/focusEngine';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import type { EngineState, PlayerEngine } from '@/core/player';
import { CLOCK_12H } from '@/core/time';
import type { PlaybackInfoData } from '@/features/playback/info/playbackInfo';
import { TuneController } from '@/features/playback/tune';
import type { CatchupEpg } from './catchupEpg';
import { DEFAULT_SEEK_KEYS } from './catchupKeyPolicy';
import { CatchupPlayback } from './catchupPlayback';
import { CatchupSession } from './catchupSession';
import { DEFAULT_SKIP } from './skipSteps';
import { HOUR, NOW, channelRow, request } from './testFixtures';
import {
  POSITION_TICK_MS,
  useCatchupInfo,
  useCatchupPosition,
  useCatchupState,
  useCatchupTicker,
  useTransportCatchup,
} from './useCatchup';

class FakeEngine {
  positionMs = 0;
  paused = false;
  state: EngineState = { kind: 'Idle' };
  private readonly listeners = new Set<() => void>();
  load = vi.fn();
  stop = vi.fn();
  seekTo = vi.fn();
  pause = vi.fn(() => this.flip(true));
  play = vi.fn(() => this.flip(false));
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private flip(paused: boolean): void {
    this.paused = paused;
    for (const listener of this.listeners) listener();
  }
}

const epg: CatchupEpg = { programmesFor: async () => [], airingAt: async () => null };
const channel = channelRow(1);
const yesterday = request(channel, NOW - 2 * HOUR, NOW - HOUR, 'Archive show');
const info: PlaybackInfoData = {
  channelId: 1,
  number: 1,
  name: 'Ch 1',
  logoUrl: null,
  group: null,
  clockText: '',
  title: 'Live',
  timeRange: null,
  remaining: null,
  progressPermille: 0,
  description: null,
  nextLine: null,
  badges: [],
  elapsed: null,
  duration: null,
};

function make() {
  const engine = new FakeEngine();
  const tuner = new TuneController({
    engine: engine as unknown as PlayerEngine,
    store: new MemoryKeyValueStore(),
    recordWatch: async () => undefined,
  });
  tuner.setChannels([channel]);
  const catchup = new CatchupPlayback({
    engine,
    tuner,
    session: new CatchupSession(),
    epg,
    seekKeys: () => DEFAULT_SEEK_KEYS,
    skip: () => DEFAULT_SKIP,
    showTransport: vi.fn(),
    pinTransport: vi.fn(),
    exitToGuide: vi.fn(),
    clock: () => NOW,
  });
  return { engine, tuner, catchup };
}

describe('useCatchup hooks', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('exposes the derived state and position as React state', () => {
    const { catchup, tuner, engine } = make();
    const state = renderHook(() => useCatchupState(catchup));
    const position = renderHook(() => useCatchupPosition(catchup));
    expect(state.result.current).toBeNull();
    act(() => catchup.enter(yesterday, false));
    expect(state.result.current?.request).toBe(yesterday);
    act(() => {
      engine.positionMs = 7_000;
      catchup.refreshPosition();
    });
    expect(position.result.current).toBe(7_000);
    act(() => tuner.tune(channel));
    expect(state.result.current).toBeNull();
  });
  it('adapts the info model only during catch-up', () => {
    const { catchup } = make();
    const hook = renderHook(() => useCatchupInfo(catchup, info, CLOCK_12H));
    expect(hook.result.current).toBe(info);
    act(() => catchup.enter(yesterday, false));
    expect(hook.result.current?.title).toBe('Archive show');
    expect(hook.result.current?.duration).toBe('1:00:00');
    const empty = renderHook(() => useCatchupInfo(catchup, null, CLOCK_12H));
    expect(empty.result.current).toBeNull();
  });
  it('builds the transport controls over the mode, tracking the engine pause', () => {
    const { catchup, engine } = make();
    const hook = renderHook(() => useTransportCatchup(catchup, engine as unknown as PlayerEngine));
    expect(hook.result.current).toBeNull();
    act(() => catchup.enter(yesterday, false));
    const controls = hook.result.current;
    expect(controls?.skip).toBe(DEFAULT_SKIP);
    act(() => controls?.onPause());
    expect(hook.result.current?.paused).toBe(true);
    act(() => {
      controls?.onSeek(30_000);
      controls?.onPrevious();
      controls?.onNext();
    });
    expect(engine.seekTo).toHaveBeenCalledWith(30_000);
  });
  it('the ticker samples the position every second and seeds focus on the pause slot', () => {
    const { catchup, engine } = make();
    catchup.enter(yesterday, false);
    const focus = { focus: vi.fn(() => true) } as unknown as FocusEngine;
    const hook = renderHook(({ transport }) => useCatchupTicker(catchup, transport, focus), {
      initialProps: { transport: false },
    });
    expect(focus.focus).not.toHaveBeenCalled();
    engine.positionMs = 3_000;
    act(() => vi.advanceTimersByTime(POSITION_TICK_MS));
    expect(catchup.position.value).toBe(3_000);
    hook.rerender({ transport: true });
    expect(focus.focus).toHaveBeenCalledWith('transport-2');
    hook.unmount();
    engine.positionMs = 9_000;
    act(() => vi.advanceTimersByTime(POSITION_TICK_MS));
    expect(catchup.position.value).toBe(3_000);
  });
});
