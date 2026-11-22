import { type GuideCell, type GuideFocus, type GuideRow, cellContains } from './guideModel';

/**
 * Pure focus-movement semantics inside one row's cell strip (Android
 * `GuideFocusNav`): LEFT stops at the cell flush with the window's left
 * edge; UP/DOWN pick the cell at a constant time anchor.
 */
function indexOf(cells: readonly GuideCell[], focused: GuideCell): number {
  return cells.findIndex((c) => c.startMs === focused.startMs);
}

export function rightOf(cells: readonly GuideCell[], focused: GuideCell): GuideCell | null {
  const index = indexOf(cells, focused);
  return index < 0 ? null : (cells[index + 1] ?? null);
}

/** The previous cell, or null when focus already touches the window's left edge. */
export function leftOf(
  cells: readonly GuideCell[],
  focused: GuideCell,
  windowStartMs: number,
): GuideCell | null {
  if (focused.startMs <= windowStartMs) return null;
  const index = indexOf(cells, focused);
  return index < 0 ? null : (cells[index - 1] ?? null);
}

/** The index of the row showing `channelId`, or -1. */
export function rowIndexOf(rows: readonly GuideRow[], channelId: number): number {
  return rows.findIndex((row) => row.channel.id === channelId);
}

/** The cell containing `anchorMs`, else the nearest edge cell. */
export function cellAt(cells: readonly GuideCell[], anchorMs: number): GuideCell | null {
  const containing = cells.find((c) => cellContains(c, anchorMs));
  if (containing !== undefined) return containing;
  const first = cells[0];
  if (first !== undefined && anchorMs < first.startMs) return first;
  return cells[cells.length - 1] ?? null;
}

/** First load: the first row's airing cell, anchored at now. */
export function initialFocus(rows: readonly GuideRow[], nowMs: number): GuideFocus | null {
  const first = rows[0];
  const cell = first === undefined ? null : cellAt(first.cells, nowMs);
  return cell === null ? null : { rowIndex: 0, cell, anchorMs: nowMs };
}

/** The cell with the same start as `focus`'s, else the one at its anchor. */
function sameStartOrAnchor(cells: readonly GuideCell[], focus: GuideFocus): GuideCell | null {
  return cells.find((c) => c.startMs === focus.cell.startMs) ?? cellAt(cells, focus.anchorMs);
}

/** Re-resolves `current` against fresh `rows`: same start, else the anchor. */
export function resolveFocus(
  rows: readonly GuideRow[],
  nowMs: number,
  current: GuideFocus | null,
): GuideFocus | null {
  if (current === null) return initialFocus(rows, nowMs);
  const rowIndex = Math.min(Math.max(current.rowIndex, 0), rows.length - 1);
  const cell = sameStartOrAnchor(rows[rowIndex]?.cells ?? [], current);
  return cell === null ? current : { ...current, rowIndex, cell };
}
