import { CHANNEL_COLUMN_DP, GRID_HEIGHT_DP, TIME_VIEWPORT_DP, xOf } from './guideGeometry';
import { GUIDE_CELL_ACTIONS, type GuideFocus } from './guideModel';
import { clamp } from './guideWindowMath';

/** Top-left position for an overlay anchored under a grid cell, in dp (relative to the grid). */
export interface GuideAnchor {
  xDp: number;
  yDp: number;
}

/** 368 px wide in capture 27; one 78 px (39 dp) row per dropdown action. */
export const MENU_WIDTH_DP = 184;
export const MENU_ROW_DP = 39;
const MENU_HEIGHT_DP = GUIDE_CELL_ACTIONS.length * MENU_ROW_DP;

/** Positions the dropdown under its cell, clamped so it never leaves the grid viewport. */
export function dropdownAnchor(
  focus: GuideFocus,
  firstVisibleRow: number,
  originMs: number,
  scrollXDp: number,
  rowHeightDp: number,
): GuideAnchor {
  const cellX = xOf(focus.cell.startMs, originMs) - scrollXDp;
  const xDp = CHANNEL_COLUMN_DP + clamp(cellX, 0, TIME_VIEWPORT_DP - MENU_WIDTH_DP);
  const rowBottom = (focus.rowIndex - firstVisibleRow + 1) * rowHeightDp;
  return { xDp, yDp: clamp(rowBottom, 0, Math.max(GRID_HEIGHT_DP - MENU_HEIGHT_DP, 0)) };
}
