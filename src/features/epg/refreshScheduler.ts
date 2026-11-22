/**
 * Pure refresh policy for playlists and EPG sources (port of Android
 * `RefreshScheduler`). Interval `NEVER_MS` (the captured default "None")
 * means "only fetch data that has never been fetched" — a lastUpdated of 0.
 */
export const HOUR_MS = 60 * 60 * 1000;

/** TiviMate default EPG/playlist update interval: 24 hours. */
export const DEFAULT_INTERVAL_MS = 24 * HOUR_MS;

/** The captured default "None": no periodic refresh. */
export const NEVER_MS = 0;

/** True when data stamped `lastUpdatedMs` needs a refresh at `nowMs` under `intervalMs`. */
export function isRefreshDue(lastUpdatedMs: number, nowMs: number, intervalMs: number): boolean {
  if (lastUpdatedMs <= 0) return true;
  return intervalMs > 0 && nowMs - lastUpdatedMs >= intervalMs;
}

/** Maps the settings value (hours, 0 = None) to milliseconds. */
export function hoursToMs(hours: number): number {
  return hours <= 0 ? NEVER_MS : hours * HOUR_MS;
}
