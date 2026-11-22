import { GRID_HEIGHT_DP, GRID_TOP_DP } from './guideGeometry';
import { rowIndexOf } from './guideFocusNav';
import type { GuideRow } from './guideModel';

/**
 * Round-7 P2: the reference does NOT dim the row the context sheet was
 * opened on. Top of the undimmed full-width row band (dp from the screen
 * top), or null when nothing is exempt: no saved channel, the channel left
 * the rows, or its row sits outside the grid viewport.
 */
export function bandTopDp(
  channelId: number | null,
  rows: readonly GuideRow[],
  firstRow: number,
  rowHeightDp: number,
): number | null {
  if (channelId === null) return null;
  const rowIndex = rowIndexOf(rows, channelId);
  const offsetDp = (rowIndex - firstRow) * rowHeightDp;
  return rowIndex >= firstRow && offsetDp < GRID_HEIGHT_DP ? GRID_TOP_DP + offsetDp : null;
}
