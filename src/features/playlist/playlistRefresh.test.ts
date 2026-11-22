import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { RefreshGate } from '@/core/refresh/refreshGate';
import { freshDb } from '@/test/dbFixtures';
import {
  defaultRefreshDeps,
  isPlaylistDue,
  type PlaylistRefreshDeps,
  refreshDuePlaylists,
  tryUpdatePlaylist,
  updatePlaylist,
} from './playlistRefresh';

const M3U =
  '#EXTM3U url-tvg="http://e"\n#EXTINF:-1 tvg-id="a",A\nhttp://s/a.ts\n#EXTINF:-1,M\nhttp://s/m.mp4\n';

describe('playlistRefresh', () => {
  let db: TellyDb;
  let deps: PlaylistRefreshDeps;
  let now: number;
  beforeEach(() => {
    db = freshDb();
    now = 1000;
    deps = {
      fetchText: vi.fn(async (url: string) => {
        if (url.includes('bad')) throw new Error('HTTP 500 while downloading playlist');
        return M3U;
      }),
      gate: new RefreshGate(),
      playlists: new PlaylistRepository(db),
      clock: () => now,
    };
  });
  afterEach(() => db.delete());

  it('updatePlaylist fetches, imports and stamps; failures propagate; the stored copy survives', async () => {
    expect(await updatePlaylist('http://p/good', deps, 'Home')).toEqual({
      playlistId: 1,
      channels: 1,
      vodItems: 1,
      epgUrl: 'http://e',
    });
    now = 2000;
    await expect(updatePlaylist('http://p/bad', deps)).rejects.toThrow('HTTP 500');
    expect(await deps.playlists.byUrl('http://p/good')).toMatchObject({ name: 'Home', lastUpdatedMs: 1000 });
    expect(await deps.playlists.byUrl('http://p/bad')).toBeNull();
    expect(await tryUpdatePlaylist('http://p/bad', deps)).toBe(false);
    expect(await tryUpdatePlaylist('http://p/good', deps)).toBe(true);
    expect(await deps.playlists.byUrl('http://p/good')).toMatchObject({ lastUpdatedMs: 2000 });
  });

  it('surfaces a gate timeout as an error', async () => {
    vi.useFakeTimers();
    const slow: PlaylistRefreshDeps = {
      ...deps,
      gate: new RefreshGate({ timeoutMs: 10 }),
      fetchText: () => new Promise<string>(() => undefined),
    };
    const pending = updatePlaylist('http://p/slow', slow);
    const expectation = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(10);
    await expectation;
    vi.useRealTimers();
  });

  it('isPlaylistDue follows the per-playlist interval (0 = never)', () => {
    const hour = 60 * 60 * 1000;
    expect(isPlaylistDue({ lastUpdatedMs: 0 }, 0, 10 * hour)).toBe(false);
    expect(isPlaylistDue({ lastUpdatedMs: 0 }, 1, hour)).toBe(true);
    expect(isPlaylistDue({ lastUpdatedMs: hour }, 2, 2 * hour)).toBe(false);
    expect(isPlaylistDue({ lastUpdatedMs: hour }, 2, 3 * hour)).toBe(true);
  });

  it('refreshDuePlaylists honours intervals and update-on-start, skipping failures', async () => {
    const twoHours = 2 * 60 * 60 * 1000;
    await deps.playlists.add('http://p/due', { epgUrl: null, channels: [], vodItems: [] }, null, () => 0);
    await deps.playlists.add(
      'http://p/fresh',
      { epgUrl: null, channels: [], vodItems: [] },
      null,
      () => twoHours,
    );
    await deps.playlists.add(
      'http://p/onstart',
      { epgUrl: null, channels: [], vodItems: [] },
      null,
      () => twoHours,
    );
    await deps.playlists.add('http://p/bad', { epgUrl: null, channels: [], vodItems: [] }, null, () => 0);
    const policy = {
      intervalHours: (url: string) => (url.endsWith('onstart') ? 0 : 1),
      updateOnStart: (url: string) => url.endsWith('onstart'),
      onStart: false,
    };
    now = twoHours;
    expect(await refreshDuePlaylists(deps, policy)).toEqual(['http://p/due']);
    expect(await refreshDuePlaylists(deps, { ...policy, onStart: true })).toEqual(['http://p/onstart']);
  });

  it('defaultRefreshDeps wires the shared gate, default repository and overrides', () => {
    const wired = defaultRefreshDeps('https://cors/', { clock: () => 5 });
    expect(wired.clock()).toBe(5);
    expect(wired.playlists).toBeInstanceOf(PlaylistRepository);
    expect(typeof wired.fetchText).toBe('function');
    expect(defaultRefreshDeps('').clock()).toBeGreaterThan(0);
  });
});
