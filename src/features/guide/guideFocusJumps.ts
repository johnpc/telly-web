import type { GuideFocusState } from './guideFocusEngine';
import { cellAt } from './guideFocusNav';
import { DAY_MS, timeAt, xOf } from './guideGeometry';
import type { GuideCell, GuideFocus, GuideRow } from './guideModel';
import { rowWindow } from './guideScrollPlanner';
import { clamp, quantizeDown, scrollCeilDp, scrollFloorDp } from './guideWindowMath';

/** The cell at `anchorMs` on row `rowIndex`; null off the list. */
export function cellOnRow(rows: readonly GuideRow[], rowIndex: number, anchorMs: number): GuideCell | null {
  return cellAt(rows[rowIndex]?.cells ?? [], anchorMs);
}

/** The row `delta` away with the cell at the anchor; null at the list's end or on an empty row. */
function rowStep(current: GuideFocus, rows: readonly GuideRow[], delta: number): GuideFocus | null {
  const rowIndex = clamp(current.rowIndex + delta, 0, rows.length - 1);
  const cell = rowIndex === current.rowIndex ? null : cellOnRow(rows, rowIndex, current.anchorMs);
  return cell === null ? null : { ...current, rowIndex, cell };
}

/** UP/DOWN keep the time anchor and scroll by rows; null when nothing changes. */
export function verticalState(
  state: GuideFocusState,
  rows: readonly GuideRow[],
  delta: number,
  visibleRows: number,
): GuideFocusState | null {
  const focus = state.focus === null ? null : rowStep(state.focus, rows, delta);
  if (focus === null) return null;
  const firstRow = rowWindow(state.firstRow, focus.rowIndex, visibleRows, rows.length);
  return { ...state, focus, firstRow };
}

/** The day-jump target, clamped to the past floor and the forward ceiling. */
function clampedDayTarget(anchorMs: number, originMs: number, days: number, floorDp: number): number {
  return clamp(anchorMs + days * DAY_MS, timeAt(floorDp, originMs), timeAt(scrollCeilDp(), originMs));
}

/**
 * Long-LEFT/RIGHT: jump the anchor a whole day and re-align the window,
 * bounded by "Past days to keep EPG" and the forward horizon. The scroll
 * change re-materializes the rows; `ensureFocus` then resolves the cell.
 */
export function dayJumpState(
  state: GuideFocusState,
  originMs: number,
  days: number,
  maxPastDays: number,
): GuideFocusState | null {
  const current = state.focus;
  if (current === null) return null;
  const floorDp = scrollFloorDp(maxPastDays);
  const anchorMs = clampedDayTarget(current.anchorMs, originMs, days, floorDp);
  const aligned = xOf(quantizeDown(anchorMs, originMs), originMs);
  return { ...state, focus: { ...current, anchorMs }, scrollX: clamp(aligned, floorDp, scrollCeilDp()) };
}

/** The focus after the window panned from `fromDp` to `toDp`: anchor shifted, cell re-picked. */
function pannedFocus(
  current: GuideFocus,
  rows: readonly GuideRow[],
  fromDp: number,
  toDp: number,
): GuideFocus {
  const anchorMs = current.anchorMs + timeAt(toDp, 0) - timeAt(fromDp, 0);
  const cell = cellOnRow(rows, current.rowIndex, anchorMs) ?? current.cell;
  return { ...current, cell, anchorMs };
}

/**
 * "Move by page": pan a whole viewport keeping the anchor's relative
 * position; null = already at the edge (left edge → the groups column).
 */
export function pageJumpState(
  state: GuideFocusState,
  rows: readonly GuideRow[],
  direction: number,
  viewportDp: number,
  clampScroll: (target: number) => number,
): GuideFocusState | null {
  const { focus: current, scrollX: from } = state;
  if (current === null) return null;
  const scrollX = clampScroll(from + direction * viewportDp);
  if (scrollX === from) return null;
  return { ...state, scrollX, focus: pannedFocus(current, rows, from, scrollX) };
}
