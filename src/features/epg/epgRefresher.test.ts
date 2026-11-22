import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistRepository } from '@/core/db/playlistRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { RefreshGate } from '@/core/refresh/refreshGate';
import { freshDb } from '@/test/dbFixtures';
import { RETRY_BACKOFF_MS } from './epgFreshness';
import { daysToMs, DEFAULT_KEEP_PAST_MS, EpgRefresher, type EpgRefresherDeps } from './epgRefresher';

describe('EpgRefresher', () => {
  let db: TellyDb;
  let deps: EpgRefresherDeps;
  let now: number;
  const fetched: string[] = [];
  beforeEach(async () => {
    db = freshDb();
    now = 10_000;
    fetched.length = 0;
    const playlists = new PlaylistRepository(db);
    deps = {
      playlists,
      intervalMs: () => 0,
      clock: () => now,
      refreshSource: vi.fn(async (url: string) => {
        fetched.push(url);
        if (url.includes('dead')) throw new Error('HTTP 404');
        return 3;
      }),
      gate: new RefreshGate(),
      customSources: async (playlistUrl) => (playlistUrl === 'http://p/one' ? ['http://custom/one.xml'] : []),
      keepPastMs: () => 7 * 24 * 60 * 60 * 1000,
      trim: vi.fn(async () => 0),
      warn: vi.fn(),
      info: vi.fn(),
    };
    const empty = { channels: [], vodItems: [] };
    await playlists.add('http://p/one', { ...empty, epgUrl: 'http://auto/one.xml' }, null, () => 1);
    await playlists.add('http://p/dead', { ...empty, epgUrl: 'http://dead/epg.xml' }, null, () => 1);
    await playlists.add('http://p/none', { ...empty, epgUrl: null }, null, () => 1);
  });
  afterEach(() => db.delete());

  it('refreshes due playlists auto-detected first then custom, stamps success/failure, trims', async () => {
    const refresher = new EpgRefresher(deps);
    expect(await refresher.refreshDue()).toEqual([1]);
    expect(fetched).toEqual(['http://auto/one.xml', 'http://custom/one.xml', 'http://dead/epg.xml']);
    expect(await deps.playlists.byId(1)).toMatchObject({ epgLastUpdatedMs: now, epgFailedAtMs: 0 });
    expect(await deps.playlists.byId(2)).toMatchObject({ epgLastUpdatedMs: 0, epgFailedAtMs: now });
    expect(await deps.playlists.byId(3)).toMatchObject({ epgLastUpdatedMs: 0, epgFailedAtMs: 0 });
    expect(deps.trim).toHaveBeenCalledWith(now - 7 * 24 * 60 * 60 * 1000);
    expect(deps.warn).toHaveBeenCalledWith('EPG refresh failed for http://dead/epg.xml', expect.any(Error));
    expect(deps.info).toHaveBeenCalledWith('EPG source http://auto/one.xml: 3 programmes stored');
  });

  it('a fresh playlist is not due at interval None; a failed one backs off; refreshAllNow ignores both', async () => {
    const refresher = new EpgRefresher(deps);
    await refresher.refreshDue();
    fetched.length = 0;
    now += 1000;
    expect(await refresher.refreshDue()).toEqual([]);
    expect(fetched).toEqual([]);
    now += RETRY_BACKOFF_MS;
    expect(await refresher.refreshDue()).toEqual([]);
    expect(fetched).toEqual(['http://dead/epg.xml']);
    fetched.length = 0;
    expect(await refresher.refreshAllNow()).toEqual([1]);
    expect(fetched).toEqual(['http://auto/one.xml', 'http://custom/one.xml', 'http://dead/epg.xml']);
  });

  it('onPlaylistsChanged forces a full refresh only when the setting is on', async () => {
    const refresher = new EpgRefresher(deps);
    await refresher.refreshDue();
    fetched.length = 0;
    now += 1;
    expect(await refresher.onPlaylistsChanged(false)).toEqual([]);
    expect(fetched).toEqual([]);
    expect(await refresher.onPlaylistsChanged(true)).toEqual([1]);
    expect(fetched).toHaveLength(3);
  });

  it('returns nothing when the gate abandons the run', async () => {
    vi.useFakeTimers();
    const slow = new EpgRefresher({
      ...deps,
      gate: new RefreshGate({ timeoutMs: 5 }),
      refreshSource: () => new Promise<number>(() => undefined),
    });
    const pending = slow.refreshAllNow();
    await vi.advanceTimersByTimeAsync(5);
    expect(await pending).toEqual([]);
    vi.useRealTimers();
  });

  it('maps keep-days to a horizon', () => {
    expect(daysToMs(7)).toBe(DEFAULT_KEEP_PAST_MS);
    expect(daysToMs(-1)).toBe(0);
  });
});
