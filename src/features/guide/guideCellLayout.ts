import { xOf } from './guideGeometry';
import type { GuideCell } from './guideModel';

/** Where a cell renders inside the row viewport, after clamping. */
export interface GuideCellPlacement {
  offsetDp: number;
  widthDp: number;
  clipped: boolean;
}

/** Smallest rendered width so a sliver of cell stays visible. */
export const MIN_CELL_DP = 8;

/**
 * Cells that started before the window clamp to its left edge (their label
 * stays visible) and widths clamp to the viewport; null = off screen.
 */
export function placeCell(
  cell: GuideCell,
  originMs: number,
  scrollXDp: number,
  viewportDp: number,
): GuideCellPlacement | null {
  const startX = xOf(cell.startMs, originMs) - scrollXDp;
  const endX = xOf(cell.endMs, originMs) - scrollXDp;
  if (endX <= 0 || startX >= viewportDp) return null;
  const left = Math.max(startX, 0);
  const right = Math.min(endX, viewportDp);
  return { offsetDp: left, widthDp: Math.max(right - left, MIN_CELL_DP), clipped: startX < 0 };
}
