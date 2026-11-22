import { xOf } from './guideGeometry';
import type { GuideCell } from './guideModel';

/**
 * Horizontal scroll (dp from the origin) keeping `cell` in view: cells left
 * of the window align their start to the left edge; cells running off the
 * right edge show their start plus as much body as fits.
 */
export function horizontalTarget(
  cell: GuideCell,
  originMs: number,
  scrollXDp: number,
  viewportDp: number,
): number {
  const startX = xOf(cell.startMs, originMs);
  const endX = xOf(cell.endMs, originMs);
  if (startX < scrollXDp) return startX;
  if (endX > scrollXDp + viewportDp) return Math.min(startX, endX - viewportDp);
  return scrollXDp;
}

/** First visible row index keeping `focusRow` inside the row window. */
export function rowWindow(
  firstVisible: number,
  focusRow: number,
  visibleRows: number,
  rowCount: number,
): number {
  const maxFirst = Math.max(rowCount - visibleRows, 0);
  const pulledUp = Math.min(firstVisible, focusRow);
  const pulledDown = Math.max(pulledUp, focusRow - visibleRows + 1);
  return Math.min(Math.max(pulledDown, 0), maxFirst);
}
