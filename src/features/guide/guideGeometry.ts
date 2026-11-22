/**
 * The guide grid's time↔x mapping, all in dp (2 px = 1 dp at 1080p; the
 * screen sets `--dp`). Reference: 320 px per 30 min, 540 px channel column,
 * 78 px row pitch (Android `GuideGeometry`).
 */
export const DP_PER_30_MIN = 160;
export const HALF_HOUR_MS = 30 * 60_000;
export const DAY_MS = 24 * 60 * 60_000;
export const CHANNEL_COLUMN_DP = 270;
export const ROW_HEIGHT_DP = 39;
export const TIME_VIEWPORT_DP = 690;
export const VISIBLE_ROWS = 7;
export const GRID_TOP_DP = 234;
export const GRID_HEIGHT_DP = 306;
export const DP_PER_MS = DP_PER_30_MIN / HALF_HOUR_MS;

/** Floor to the LOCAL wall-clock half hour: the grid's time origin. */
export function halfHourFloor(nowMs: number): number {
  const d = new Date(nowMs);
  d.setMinutes(d.getMinutes() >= 30 ? 30 : 0, 0, 0);
  return d.getTime();
}

/** X in dp (relative to the origin's x=0) where `timeMs` falls. */
export function xOf(timeMs: number, originMs: number): number {
  return (timeMs - originMs) * DP_PER_MS;
}

/** Inverse of `xOf`: the instant rendered at `xDp`. */
export function timeAt(xDp: number, originMs: number): number {
  return originMs + Math.trunc(xDp / DP_PER_MS);
}

export function widthOf(startMs: number, endMs: number): number {
  return (endMs - startMs) * DP_PER_MS;
}

/** A CSS length for `dp` units, scaled by the screen's `--dp` variable. */
export function dp(value: number): string {
  return `calc(${value} * var(--dp))`;
}
