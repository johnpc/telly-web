import type { PlaylistRepository } from '@/core/db/playlistRepository';
import type { PlaylistRow } from '@/core/db/types';
import type { RefreshGate } from '@/core/refresh/refreshGate';
import { epgFreshnessOf, isEpgDue } from './epgFreshness';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Captured default: "Past days to keep EPG" = 7. */
export const DEFAULT_KEEP_PAST_MS = 7 * DAY_MS;

/** Maps the settings value (days) to a keep horizon in ms. */
export function daysToMs(days: number): number {
  return Math.max(0, days) * DAY_MS;
}

export interface EpgRefresherDeps {
  playlists: PlaylistRepository;
  /** Settings -> EPG -> "Update interval, hours" in ms (0 = None), read live. */
  intervalMs: () => number;
  clock: () => number;
  /** Downloads + stores one EPG source; resolves to the programme count. */
  refreshSource: (epgUrl: string) => Promise<number>;
  /** Shared with playlist imports, so the two never contend. */
  gate: RefreshGate;
  customSources: (playlistUrl: string) => Promise<string[]>;
  /** The "Past days to keep EPG" horizon and the trim that enforces it. */
  keepPastMs: () => number;
  trim: (cutoffMs: number) => Promise<unknown>;
  warn: (message: string, cause: unknown) => void;
  info: (message: string) => void;
}

/**
 * Applies the refresh policy (port of Android `EpgRefresher`): refreshes
 * every configured EPG source — the auto-detected `url-tvg` plus the
 * playlist's custom sources — of every playlist whose data is due, and
 * stamps the playlists where at least one source succeeded. Sources are
 * fetched auto-detected FIRST, then custom in added order; each document
 * replaces a channel's whole schedule, so custom sources win per channel.
 */
export class EpgRefresher {
  constructor(private readonly deps: EpgRefresherDeps) {}

  /** Refreshes everything due per `EpgFreshness`; returns the ids of the playlists updated. */
  refreshDue(): Promise<number[]> {
    return this.refreshWhere((p) => isEpgDue(epgFreshnessOf(p), this.deps.clock(), this.deps.intervalMs()));
  }

  /** Settings -> "Update EPG": refreshes every source regardless of age or backoff. */
  refreshAllNow(): Promise<number[]> {
    return this.refreshWhere(() => true);
  }

  /** A playlists change: "Update EPG on playlists change" ON forces a full refresh; OFF keeps the due policy. */
  onPlaylistsChanged(updateOnChange: boolean): Promise<number[]> {
    return updateOnChange ? this.refreshAllNow() : this.refreshDue();
  }

  private refreshWhere(due: (playlist: PlaylistRow) => boolean): Promise<number[]> {
    return this.deps.gate.run<number[]>('EPG refresh', [], () => this.refreshEach(due));
  }

  private async refreshEach(due: (playlist: PlaylistRow) => boolean): Promise<number[]> {
    const updated: number[] = [];
    for (const playlist of await this.deps.playlists.all()) {
      if (due(playlist) && (await this.refreshPlaylist(playlist))) updated.push(playlist.id);
    }
    await this.deps.trim(this.deps.clock() - this.deps.keepPastMs());
    return updated;
  }

  /** Auto-detected `url-tvg` first, then the custom sources in added order. */
  private async sourcesFor(playlist: PlaylistRow): Promise<string[]> {
    const auto = playlist.epgUrl === null ? [] : [playlist.epgUrl];
    return [...auto, ...(await this.deps.customSources(playlist.url))];
  }

  /** True when at least one source succeeded (stamped updated); all failed stamps the failure. */
  private async refreshPlaylist(playlist: PlaylistRow): Promise<boolean> {
    const sources = await this.sourcesFor(playlist);
    if (sources.length === 0) return false;
    const succeeded = await this.countSucceeded(sources);
    if (succeeded === 0) await this.deps.playlists.markEpgFailed(playlist.id, this.deps.clock());
    else await this.deps.playlists.markEpgUpdated(playlist.id, this.deps.clock());
    return succeeded > 0;
  }

  private async countSucceeded(sources: readonly string[]): Promise<number> {
    let succeeded = 0;
    for (const url of sources) if (await this.refreshSource(url)) succeeded += 1;
    return succeeded;
  }

  /** Failures are swallowed per source (but logged) so one bad source cannot starve the others. */
  private async refreshSource(url: string): Promise<boolean> {
    try {
      const count = await this.deps.refreshSource(url);
      this.deps.info(`EPG source ${url}: ${count} programmes stored`);
      return true;
    } catch (error) {
      this.deps.warn(`EPG refresh failed for ${url}`, error);
      return false;
    }
  }
}
