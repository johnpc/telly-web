import { HALF_HOUR_MS, timeAt, xOf } from './guideGeometry';
import { type ClockStyle, timeLabel } from './guideTimes';
import { quantizeDown } from './guideWindowMath';

/** One 30-min timeline label, positioned relative to the grid's left edge. */
export interface GuideTick {
  offsetDp: number;
  label: string;
}

/** The first 30-min mark at or after the window's left edge. */
function firstTick(originMs: number, scrollXDp: number): number {
  const windowStartMs = timeAt(scrollXDp, originMs);
  const floored = quantizeDown(windowStartMs, originMs);
  return floored < windowStartMs ? floored + HALF_HOUR_MS : floored;
}

/** The scrolling timeline header: labels every 30 minutes across the viewport. */
export function ticks(
  originMs: number,
  scrollXDp: number,
  viewportDp: number,
  style: ClockStyle,
): GuideTick[] {
  const windowEndMs = timeAt(scrollXDp + viewportDp, originMs);
  const out: GuideTick[] = [];
  for (let tickMs = firstTick(originMs, scrollXDp); tickMs < windowEndMs; tickMs += HALF_HOUR_MS) {
    out.push({ offsetDp: xOf(tickMs, originMs) - scrollXDp, label: timeLabel(tickMs, style) });
  }
  return out;
}

/** X of the now-line inside the grid viewport; null when off screen. */
export function nowLineOffset(
  nowMs: number,
  originMs: number,
  scrollXDp: number,
  viewportDp: number,
): number | null {
  const offset = xOf(nowMs, originMs) - scrollXDp;
  return offset >= 0 && offset <= viewportDp ? offset : null;
}
