import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { RefreshGate } from '@/core/refresh/refreshGate';
import { SettingsContext } from '@/core/settings/settingsContext';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { freshDb } from '@/test/dbFixtures';
import { usePlaylistRefresh } from './usePlaylistRefresh';
import { usePlaylists } from './usePlaylists';

describe('playlist hooks', () => {
  let db: TellyDb;
  let playlists: PlaylistRepository;
  beforeEach(() => {
    db = freshDb();
    playlists = new PlaylistRepository(db);
  });
  afterEach(() => db.delete());

  it('usePlaylists re-renders as rows change', async () => {
    const { result } = renderHook(() => usePlaylists(playlists));
    await waitFor(() => expect(result.current).toEqual([]));
    await act(async () => {
      await playlists.add('http://p', { epgUrl: null, channels: [], vodItems: [] }, 'P', () => 1);
    });
    await waitFor(() => expect(result.current?.map((p) => p.name)).toEqual(['P']));
  });

  it('usePlaylistRefresh fetches the playlist (direct first, proxy fallback) and imports', async () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    settings.set(TellySettings.CORS_PROXY, 'https://cors/');
    const seen: string[] = [];
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsContext value={settings}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </SettingsContext>
    );
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      seen.push(String(input));
      // The direct request is CORS-blocked (a network error); the proxy answers.
      if (!String(input).startsWith('https://cors/')) throw new TypeError('Failed to fetch');
      return new Response('#EXTM3U\n#EXTINF:-1,A\nhttp://s/a.ts\n');
    });
    const { result } = renderHook(
      () => usePlaylistRefresh({ playlists, gate: new RefreshGate(), clock: () => 7 }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync({ url: 'http://p/l.m3u', name: 'Mine' });
    });
    await waitFor(() =>
      expect(result.current.data).toEqual({ playlistId: 1, channels: 1, vodItems: 0, epgUrl: null }),
    );
    expect(seen).toEqual(['http://p/l.m3u', 'https://cors/http%3A%2F%2Fp%2Fl.m3u']);
    vi.unstubAllGlobals();
    expect(await playlists.byUrl('http://p/l.m3u')).toMatchObject({ name: 'Mine', lastUpdatedMs: 7 });
  });
});
