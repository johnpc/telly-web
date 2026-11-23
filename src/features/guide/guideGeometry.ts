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

/** Portrait phones: a narrower channel column (number, logo, truncated name) and a compact 108 dp top strip. */
export const NARROW_CHANNEL_COLUMN_DP = 170;
export const COMPACT_TOP_STRIP_DP = 108;
const HEADER_DP = GRID_TOP_DP - 192;

/** The grid's layout on the current canvas: the channel column, the time viewport beside it, the grid's top and how many rows fit. */
export interface GuideDims {
  channelColumnDp: number;
  timeViewportDp: number;
  gridTopDp: number;
  /** Rows the grid can show (never fewer than the reference 7; taller canvases fill up). */
  gridRows: number;
  /** Portrait phone: compact top strip, narrow channel column. */
  compact: boolean;
}

/** The 1080p reference: 270 dp column + 690 dp viewport under the 234 dp top. */
export const TV_DIMS: GuideDims = {
  channelColumnDp: CHANNEL_COLUMN_DP,
  timeViewportDp: TIME_VIEWPORT_DP,
  gridTopDp: GRID_TOP_DP,
  gridRows: VISIBLE_ROWS,
  compact: false,
};

/** Fits the grid to a canvas: wider canvases show more time, taller ones more rows, portrait phones degrade to fewer columns. */
export function dimsFor(canvas: { widthDp: number; heightDp: number; portrait: boolean }): GuideDims {
  const compact = canvas.portrait;
  const channelColumnDp = compact ? NARROW_CHANNEL_COLUMN_DP : CHANNEL_COLUMN_DP;
  const gridTopDp = compact ? COMPACT_TOP_STRIP_DP + HEADER_DP : GRID_TOP_DP;
  return {
    channelColumnDp,
    timeViewportDp: Math.max(DP_PER_30_MIN, canvas.widthDp - channelColumnDp),
    gridTopDp,
    gridRows: Math.max(VISIBLE_ROWS, Math.floor((canvas.heightDp - gridTopDp) / ROW_HEIGHT_DP)),
    compact,
  };
}
