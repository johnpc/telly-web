import { DAY_MS, DP_PER_MS, HALF_HOUR_MS, timeAt } from './guideGeometry';

/** A half-open time span [fromMs, toMs) the grid materializes cells for. */
export interface GuideSpan {
  fromMs: number;
  toMs: number;
}

/** Prefetch margin on both sides of the visible window. */
export const PREFETCH_MS = 3 * 60 * 60_000;

/** Forward navigation limit; typical EPG horizon. */
export const FORWARD_DAYS = 7;

export function visibleSpan(originMs: number, scrollXDp: number, viewportDp: number): GuideSpan {
  return { fromMs: timeAt(scrollXDp, originMs), toMs: timeAt(scrollXDp + viewportDp, originMs) };
}

/** Visible window + prefetch, quantized to the origin's 30-min grid so queries only re-run on real changes. */
export function materializeSpan(originMs: number, scrollXDp: number, viewportDp: number): GuideSpan {
  const visible = visibleSpan(originMs, scrollXDp, viewportDp);
  return {
    fromMs: quantizeDown(visible.fromMs - PREFETCH_MS, originMs),
    toMs: quantizeUp(visible.toMs + PREFETCH_MS, originMs),
  };
}

/** Lowest allowed scroll: "Past days to keep EPG" back from the origin. */
export function scrollFloorDp(pastDays: number): number {
  return -pastDays * DAY_MS * DP_PER_MS;
}

export function scrollCeilDp(): number {
  return FORWARD_DAYS * DAY_MS * DP_PER_MS;
}

/** Floors `timeMs` onto the origin's 30-min grid. */
export function quantizeDown(timeMs: number, originMs: number): number {
  return originMs + Math.floor((timeMs - originMs) / HALF_HOUR_MS) * HALF_HOUR_MS;
}

export function quantizeUp(timeMs: number, originMs: number): number {
  const floored = quantizeDown(timeMs, originMs);
  return floored === timeMs ? floored : floored + HALF_HOUR_MS;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
