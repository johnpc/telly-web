// @stateMachine('EPG freshness')
import type { PlaylistRow } from '@/core/db/types';
import { isRefreshDue } from './refreshScheduler';

/**
 * The freshness of one playlist's EPG, read off its two persisted stamps —
 * the ONE place the `0 = never` sentinels are interpreted (port of Android
 * `EpgFreshness`). The refresher's due loop asks `isEpgDue`; "Update EPG"
 * ignores it and refreshes regardless.
 */
export type EpgFreshness =
  /** No successful fetch yet and no failed attempt recorded: always due. */
  | { kind: 'NeverFetched' }
  /** The last attempt fetched something at `atMs`; due again after the interval. */
  | { kind: 'Fresh'; atMs: number }
  /** The last attempt at `failedAtMs` fetched nothing (`lastSuccessMs` = 0 when it never succeeded). */
  | { kind: 'Failed'; failedAtMs: number; lastSuccessMs: number };

/** A playlist whose every source failed waits this long before the due loop retries it. */
export const RETRY_BACKOFF_MS = 5 * 60 * 1000;

export function epgFreshnessOf(
  playlist: Pick<PlaylistRow, 'epgLastUpdatedMs' | 'epgFailedAtMs'>,
): EpgFreshness {
  if (playlist.epgFailedAtMs > playlist.epgLastUpdatedMs) {
    return { kind: 'Failed', failedAtMs: playlist.epgFailedAtMs, lastSuccessMs: playlist.epgLastUpdatedMs };
  }
  if (playlist.epgLastUpdatedMs > 0) return { kind: 'Fresh', atMs: playlist.epgLastUpdatedMs };
  return { kind: 'NeverFetched' };
}

/** The scheduled-refresh decision for `freshness` at `nowMs` under `intervalMs`. */
export function isEpgDue(freshness: EpgFreshness, nowMs: number, intervalMs: number): boolean {
  switch (freshness.kind) {
    case 'NeverFetched':
      return true;
    case 'Fresh':
      return isRefreshDue(freshness.atMs, nowMs, intervalMs);
    case 'Failed':
      return (
        nowMs - freshness.failedAtMs >= RETRY_BACKOFF_MS &&
        isRefreshDue(freshness.lastSuccessMs, nowMs, intervalMs)
      );
  }
}
