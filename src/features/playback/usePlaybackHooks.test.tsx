import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { WatchHistoryRepository } from '@/core/db/watchHistoryRepository';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { Navigator } from '@/core/navigation/navigator';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { PipState } from '@/features/pip/pipState';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import { channel, fakeEngine, tunerOver, UTC } from './fixtures.test';
import { OverlayState } from './overlay/overlayState';
import { INFO } from './overlay/playbackOverlay';
import { InstantStore, Signal } from './overlay/signal';
import { DETAILS_POLL_MS, useStreamDetails } from './info/useStreamDetails';
import { panelStyleOf, useClockStyle, usePanelStyle } from './info/usePlayerSettings';
import { usePlaybackInfo } from './info/usePlaybackInfo';
import { useRecentCards } from './info/useRecentCards';
import { useTrackSource } from './tracks/useTrackSource';
import { usePlaybackController } from './usePlaybackController';
import { usePlaybackStart } from './usePlaybackStart';
import {
  useGatePrompt,
  useInstant,
  useNumberDigits,
  useOverlay,
  usePipMode,
  useSignal,
} from './usePlaybackStores';
import { BlockGate } from './gate/blockGate';
import { NumberEntry } from './zap/numberEntry';
import { useHistoryRows } from '@/features/history/useHistoryRows';
import { HistoryScreen } from '@/features/history/HistoryScreen';

describe('store hooks', () => {
  it('re-render on every external store change', () => {
    const overlays = new OverlayState({ set: () => 0 as never, clear: () => undefined });
    const instant = new InstantStore(() => 5);
    const signal = new Signal();
    const gate = new BlockGate();
    const entry = new NumberEntry(() => undefined);
    const pip = new PipState();
    const { result } = renderHook(() => ({
      overlay: useOverlay(overlays),
      instant: useInstant(instant),
      signal: useSignal(signal),
      prompt: useGatePrompt(gate),
      digits: useNumberDigits(entry),
      pip: usePipMode(pip),
    }));
    expect(result.current).toEqual({
      overlay: { kind: 'None' },
      instant: 5,
      signal: 0,
      prompt: null,
      digits: null,
      pip: false,
    });
    act(() => {
      overlays.set(INFO);
      instant.refresh();
      signal.notify();
      entry.push(4);
      pip.setInPip(true);
    });
    expect(result.current).toMatchObject({ overlay: INFO, signal: 1, digits: '4', pip: true });
    entry.cancel();
  });

  it('usePlaybackStart feeds the list, starts a fresh tuner once and resumes the stored channel on a re-mount', () => {
    const engine = fakeEngine();
    const list = [channel(1), channel(2)];
    const tuner = tunerOver(engine, []);
    const { rerender } = renderHook(({ channels }) => usePlaybackStart(tuner, channels), {
      initialProps: { channels: [] as typeof list },
    });
    expect(engine.load).not.toHaveBeenCalled();
    rerender({ channels: list });
    rerender({ channels: [...list] });
    expect(engine.load).toHaveBeenCalledTimes(1);
    expect(tuner.channels).toHaveLength(2);
    const again = fakeEngine();
    const second = tunerOver(again, list);
    second.tune(channel(2));
    renderHook(() => usePlaybackStart(second, list));
    expect(again.load).toHaveBeenCalledTimes(2);
  });

  it('settings hooks resolve the clock and panel style', () => {
    const repo = new SettingsRepository(
      new MemoryKeyValueStore({ appearance_clock_format: '24-hour', appearance_player_transparency: '150' }),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={repo}>{children}</SettingsContext>
    );
    const { result } = renderHook(() => ({ clock: useClockStyle(), panel: usePanelStyle() }), { wrapper });
    expect(result.current.clock).toEqual({ is24h: true });
    expect(result.current.panel).toEqual({ alphaFactor: 0, showClock: true });
    expect(panelStyleOf(25, false)).toEqual({ alphaFactor: 0.75, showClock: false });
    expect(panelStyleOf(-5, true).alphaFactor).toBe(1);
  });

  it('useStreamDetails samples on engine events and on the poll while active', () => {
    vi.useFakeTimers();
    const engine = fakeEngine();
    const { result, rerender } = renderHook(({ active }) => useStreamDetails(engine, active), {
      initialProps: { active: false },
    });
    expect(result.current?.width).toBe(1280);
    engine.streamDetails = vi.fn(() => ({ width: 1920, height: 1080, frameRate: 0, audioChannels: 2 }));
    act(() => engine.emit());
    expect(result.current?.height).toBe(1080);
    const before = result.current;
    act(() => engine.emit());
    expect(result.current).toBe(before);
    rerender({ active: true });
    engine.streamDetails = vi.fn(() => ({ width: 1920, height: 1080, frameRate: 50, audioChannels: 2 }));
    act(() => vi.advanceTimersByTime(DETAILS_POLL_MS));
    expect(result.current?.frameRate).toBe(50);
    vi.useRealTimers();
  });

  it('useTrackSource re-reads the engine on events and on the changed signal', () => {
    const engine = fakeEngine();
    const changed = new Signal();
    const { result } = renderHook(() => useTrackSource(engine, null, changed));
    expect(result.current.audioSyncMs).toBe(0);
    engine.audioSyncMs = 75;
    act(() => changed.notify());
    expect(result.current.audioSyncMs).toBe(75);
    act(() => engine.emit());
    expect(result.current.tracks.videos).toEqual([]);
  });
});

describe('EPG-backed hooks', () => {
  let db: TellyDb;
  const minute = 60_000;
  const T = Date.UTC(2026, 8, 13, 14, 45);
  beforeEach(async () => {
    db = freshDb();
    await new ChannelRepository(db).replaceForPlaylist(1, [
      channelImport('A', { tvgId: 'c1' }),
      channelImport('B', { tvgId: 'c2' }),
    ]);
    await new ProgramRepository(db).replaceFor(
      ['c1'],
      [
        programImport('c1', T - minute, T + minute, 'Now A'),
        programImport('c1', T + minute, T + 2 * minute, 'Next A'),
      ],
    );
  });
  afterEach(() => db.delete());

  it('usePlaybackInfo resolves now/next for the tuned channel (the EPG hub reads the production tables)', async () => {
    const { result } = renderHook(() => usePlaybackInfo(channel(1, { tvgId: 'none-such' }), T, null, UTC));
    await waitFor(() => expect(result.current?.title).toBeNull());
    expect(renderHook(() => usePlaybackInfo(null, T, null, UTC)).result.current).toBeNull();
    const { result: bare } = renderHook(() => usePlaybackInfo(channel(1, { tvgId: null }), T, null, UTC));
    await waitFor(() => expect(bare.current?.badges).toEqual([]));
  });

  it('useRecentCards and useHistoryRows derive from the watch history table', async () => {
    const history = new WatchHistoryRepository(db);
    const channels = new ChannelRepository(db);
    const rows = await channels.visible();
    await history.upsert({ channelKey: 'c1', watchedAtMs: T });
    await history.upsert({ channelKey: 'c2', watchedAtMs: T + 1 });
    const { result } = renderHook(() => useRecentCards(rows, rows[1]?.id ?? null, T, UTC, history));
    await waitFor(() => expect(result.current.map((c) => c.name)).toEqual(['A']));
    const deps = { history, channels };
    const { result: list } = renderHook(() => useHistoryRows(UTC, deps));
    await waitFor(() => expect(list.current?.map((r) => r.name)).toEqual(['B', 'A']));
  });
});

describe('usePlaybackController + HistoryScreen', () => {
  it('wires keys, PIP dismissal and the resize mode for a session', async () => {
    const engine = fakeEngine();
    const tuner = tunerOver(engine, [channel(1), channel(2)]);
    const repo = new SettingsRepository(new MemoryKeyValueStore({ playback_resize_mode: 'zoom' }));
    const pip = new PipState();
    const navigator = new Navigator({ kind: 'Playback' });
    const session = { engine, tuner, channels: tuner.channels, playing: null };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={repo}>
        <NavigatorProvider navigator={navigator}>
          <RemoteKeysProvider onBack={() => undefined}>{children}</RemoteKeysProvider>
        </NavigatorProvider>
      </SettingsContext>
    );
    const { result } = renderHook(() => usePlaybackController(session, pip), { wrapper });
    await act(async () => undefined);
    expect(engine.resizeMode).toBe('Zoom');
    expect(engine.load).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));
    });
    expect(result.current.overlays.value.kind).toBe('ZapInfo');
    act(() => pip.setInPip(true));
    expect(result.current.overlays.value.kind).toBe('None');
    act(() => repo.set(TellySettings.RESIZE_MODE, 'Fit'));
    expect(engine.resizeMode).toBe('Fit');
  });

  it('HistoryScreen renders rows from the production tables and pops on BACK', async () => {
    const navigator = new Navigator({ kind: 'Playback' });
    navigator.push({ kind: 'History' });
    render(
      <NavigatorProvider navigator={navigator}>
        <RemoteKeysProvider onBack={() => undefined}>
          <HistoryScreen />
        </RemoteKeysProvider>
      </NavigatorProvider>,
    );
    await waitFor(() => expect(screen.getByText('No history')).toBeInTheDocument());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(navigator.current.kind).toBe('Playback');
  });
});
