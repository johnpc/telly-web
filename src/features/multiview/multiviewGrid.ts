/** One pane cell as screen fractions; panes letterbox 16:9 inside their cell. */
export interface PaneCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAX_PANES = 4;

const HALF = 0.5;
const QUARTER = 0.25;
const TWO_THIRDS = 2 / 3;
const THIRD = 1 / 3;

/** Pane menu metrics in rem (Android: 200 dp wide, 40 dp rows, 20 dp off the pane, 16 dp screen edge). */
export const MENU_WIDTH_REM = 25;
export const MENU_ROW_REM = 5;
const MENU_GAP_REM = 2.5;
const MENU_EDGE_REM = 2;

const cell = (x: number, y: number, w: number, h: number): PaneCell => ({ x, y, w, h });

/**
 * Multiview mosaic geometry (port of Android `MultiviewGrid`): 1 = a centred
 * half-size pane (the captured teaser framing), 2 = side-by-side halves,
 * 3 = one large pane left + two stacked right (no dead cell), 4 = 2x2 quadrants.
 */
const LAYOUTS: Readonly<Record<number, readonly PaneCell[]>> = {
  1: [cell(QUARTER, QUARTER, HALF, HALF)],
  2: [cell(0, 0, HALF, 1), cell(HALF, 0, HALF, 1)],
  3: [cell(0, 0, TWO_THIRDS, 1), cell(TWO_THIRDS, 0, THIRD, HALF), cell(TWO_THIRDS, HALF, THIRD, HALF)],
  4: [
    cell(0, 0, HALF, HALF),
    cell(HALF, 0, HALF, HALF),
    cell(0, HALF, HALF, HALF),
    cell(HALF, HALF, HALF, HALF),
  ],
};

const SINGLE: readonly PaneCell[] = LAYOUTS[1] ?? [];

export function cells(count: number): readonly PaneCell[] {
  return LAYOUTS[count] ?? SINGLE;
}

/** The cell of pane `index` in a `count`-pane grid (the single-pane framing when out of range). */
export function cellAt(count: number, index: number): PaneCell {
  return cells(count)[index] ?? SINGLE[0] ?? cell(0, 0, 1, 1);
}

const pct = (fraction: number): string => `${(fraction * 100).toFixed(4)}%`;

/** Absolute-position CSS for a cell inside the full-screen grid. */
export interface CellStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

export function cellStyle(cell: PaneCell): CellStyle {
  return { left: pct(cell.x), top: pct(cell.y), width: pct(cell.w), height: pct(cell.h) };
}

/** Top-left of the pane menu: right of the cell, vertically centred on it, clamped inside the screen. */
export interface MenuPlacement {
  left: string;
  top: string;
}

export function menuPlacement(cell: PaneCell, rowCount: number): MenuPlacement {
  const menuH = rowCount * MENU_ROW_REM;
  const right = `calc(${pct(cell.x + cell.w)} + ${MENU_GAP_REM}rem)`;
  const maxLeft = `calc(100% - ${MENU_WIDTH_REM + MENU_EDGE_REM}rem)`;
  const centred = `calc(${pct(cell.y + cell.h / 2)} - ${menuH / 2}rem)`;
  const maxTop = `calc(100% - ${menuH + MENU_EDGE_REM}rem)`;
  return { left: `min(${right}, ${maxLeft})`, top: `clamp(${MENU_EDGE_REM}rem, ${centred}, ${maxTop})` };
}

/** Focus / test id of a pane. */
export function paneFocusId(paneId: number): string {
  return `multiview-pane-${paneId}`;
}
