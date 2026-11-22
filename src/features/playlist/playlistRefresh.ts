import { type PlaylistRepository, playlistRepository } from '@/core/db/playlistRepository';
import type { PlaylistRow } from '@/core/db/types';
import { type RefreshGate, sharedRefreshGate } from '@/core/refresh/refreshGate';
import { type ImportResult, importPlaylist } from './channelImporter';
import { fetchPlaylistText } from './playlistFetcher';

export interface PlaylistRefreshDeps {
  fetchText: (url: string) => Promise<string>;
  gate: RefreshGate;
  playlists: PlaylistRepository;
  clock: () => number;
}

export function defaultRefreshDeps(
  proxyBase: string,
  overrides: Partial<PlaylistRefreshDeps> = {},
): PlaylistRefreshDeps {
  return {
    fetchText: (url) => fetchPlaylistText(url, { proxyBase }),
    gate: sharedRefreshGate,
    playlists: playlistRepository,
    clock: (): number => Date.now(),
    ...overrides,
  };
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * "Update playlist": re-runs the wizard's fetch + parse + import path for an
 * already-stored URL through the shared gate (Android `PlaylistUpdater`).
 * Throws on fetch/parse/import failure or when the gate abandons the run;
 * the stored copy stays untouched either way.
 */
export async function updatePlaylist(
  sourceUrl: string,
  deps: PlaylistRefreshDeps,
  name: string | null = null,
): Promise<ImportResult> {
  const result = await deps.gate.run<ImportResult | null>('Playlist refresh', null, async () => {
    const text = await deps.fetchText(sourceUrl);
    return importPlaylist(sourceUrl, text, { name, clock: deps.clock, playlists: deps.playlists });
  });
  if (result === null) throw new Error(`Playlist refresh timed out for ${sourceUrl}`);
  return result;
}

/** Failure-swallowing variant for background loops: true when re-imported. */
export async function tryUpdatePlaylist(sourceUrl: string, deps: PlaylistRefreshDeps): Promise<boolean> {
  try {
    await updatePlaylist(sourceUrl, deps);
    return true;
  } catch {
    return false;
  }
}

/** Per-playlist "Update interval, hours" policy over `lastUpdatedMs` (0 = None, never periodic). */
export function isPlaylistDue(
  playlist: Pick<PlaylistRow, 'lastUpdatedMs'>,
  intervalHours: number,
  nowMs: number,
): boolean {
  const intervalMs = intervalHours <= 0 ? 0 : intervalHours * HOUR_MS;
  return intervalMs > 0 && nowMs - playlist.lastUpdatedMs >= intervalMs;
}

export interface DuePolicy {
  intervalHours: (url: string) => number;
  updateOnStart: (url: string) => boolean;
  /** App launch: "Update on app start" playlists are refreshed in addition to anything due. */
  onStart: boolean;
}

/** Refreshes every due playlist (Android `PlaylistRefresher`); returns the URLs that succeeded. */
export async function refreshDuePlaylists(deps: PlaylistRefreshDeps, policy: DuePolicy): Promise<string[]> {
  const due = (await deps.playlists.all()).filter(
    (p) =>
      isPlaylistDue(p, policy.intervalHours(p.url), deps.clock()) ||
      (policy.onStart && policy.updateOnStart(p.url)),
  );
  const done: string[] = [];
  for (const playlist of due) if (await tryUpdatePlaylist(playlist.url, deps)) done.push(playlist.url);
  return done;
}
