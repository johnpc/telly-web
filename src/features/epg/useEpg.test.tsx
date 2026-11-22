import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { RefreshGate } from '@/core/refresh/refreshGate';
import { SettingsContext } from '@/core/settings/settingsContext';
import { TellySettings } from '@/core/settings/tellySettings';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import { useEpgRefresh } from './useEpgRefresh';
import { useNowNext } from './useNowNext';
import { useProgramsInRange } from './useProgramsInRange';

describe('EPG hooks', () => {
  let db: TellyDb;
  let programs: ProgramRepository;
  let channels: ChannelRepository;
  const minute = 60_000;
  beforeEach(async () => {
    db = freshDb();
    programs = new ProgramRepository(db);
    channels = new ChannelRepository(db);
    await channels.replaceForPlaylist(1, [
      channelImport('A', { tvgId: 'a' }),
      channelImport('B', { tvgId: 'b' }),
    ]);
    await programs.replaceFor(
      ['a', 'b'],
      [
        programImport('a', 0, 10 * minute, 'a0'),
        programImport('a', 10 * minute, 20 * minute, 'a1'),
        programImport('b', 0, 20 * minute, 'b0'),
      ],
    );
  });
  afterEach(() => db.delete());

  it('useProgramsInRange applies per-channel offsets live', async () => {
    const deps = { programs, channels };
    const { result } = renderHook(() => useProgramsInRange(['a', 'b'], 0, 10 * minute, deps));
    await waitFor(() => expect(result.current?.map((p) => p.title)).toEqual(['a0', 'b0']));
    const [a] = await channels.forPlaylist(1);
    await act(async () => {
      await channels.updateOverrides(a?.id ?? 0, { epgOffsetMinutes: -10 });
    });
    await waitFor(() => expect(result.current?.map((p) => p.title)).toEqual(['a1', 'b0']));
    const { result: empty } = renderHook(() => useProgramsInRange([], 0, 10, deps));
    await waitFor(() => expect(empty.current).toEqual([]));
  });

  it('useNowNext resolves per channel at the given instant', async () => {
    const deps = { programs, channels };
    const { result } = renderHook(() => useNowNext(['a', 'b', 'zzz'], 5 * minute, deps));
    await waitFor(() => expect(result.current?.size).toBe(2));
    expect(result.current?.get('a')).toMatchObject({ now: { title: 'a0' }, next: { title: 'a1' } });
    expect(result.current?.get('b')).toMatchObject({ now: { title: 'b0' }, next: null });
  });

  it('useEpgRefresh fires on EPG-relevant playlist changes only and exposes manual modes', async () => {
    const playlists = new PlaylistRepository(db);
    await playlists.add('http://p', { epgUrl: 'http://e/1.xml', channels: [], vodItems: [] }, null, () => 1);
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const refreshSource = vi.fn(async () => 1);
    const overrides = {
      playlists,
      refreshSource,
      gate: new RefreshGate(),
      trim: async () => 0,
      customSources: async () => [],
      warn: vi.fn(),
    };
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={settings}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </SettingsContext>
    );
    const { result } = renderHook(() => useEpgRefresh(overrides), { wrapper });
    // The first emission is the baseline (app start runs the due policy elsewhere): no fetch.
    await act(async () => {
      await result.current.mutateAsync('due');
    });
    expect(refreshSource).toHaveBeenCalledTimes(1);
    // The refresher's own stamp write must not retrigger.
    await act(async () => {
      await playlists.markEpgUpdated(1, 99);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshSource).toHaveBeenCalledTimes(1);
    // A new EPG URL is an EPG-relevant change: with "update on playlists change" OFF the due
    // policy runs (fresh stamp → nothing fetched)...
    await act(async () => {
      await playlists.add(
        'http://p',
        { epgUrl: 'http://e/2.xml', channels: [], vodItems: [] },
        null,
        () => 2,
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshSource).toHaveBeenCalledTimes(1);
    // ...with it ON the change force-fetches every source.
    settings.set(TellySettings.EPG_UPDATE_ON_PLAYLISTS_CHANGE, true);
    await act(async () => {
      await playlists.add(
        'http://p',
        { epgUrl: 'http://e/3.xml', channels: [], vodItems: [] },
        null,
        () => 3,
      );
    });
    await waitFor(() => expect(refreshSource).toHaveBeenCalledTimes(2));
    expect(refreshSource).toHaveBeenLastCalledWith('http://e/3.xml');
    // "Update EPG" forces every source regardless.
    await act(async () => {
      await result.current.mutateAsync('all');
    });
    expect(refreshSource).toHaveBeenCalledTimes(3);
    await act(async () => {
      expect(await result.current.mutateAsync('due')).toEqual([]);
    });
  });
});
