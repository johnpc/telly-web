import { describe, expect, it } from 'vitest';
import {
  MAX_PANES,
  MENU_ROW_REM,
  cellAt,
  cellStyle,
  cells,
  menuPlacement,
  paneFocusId,
} from './multiviewGrid';

describe('multiviewGrid', () => {
  it('lays 1 pane centred half-size, 2 side by side, 3 as large-left + stacked right, 4 as quadrants', () => {
    expect(cells(1)).toEqual([{ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }]);
    expect(cells(0)).toEqual(cells(1));
    expect(cells(2).map((c) => c.x)).toEqual([0, 0.5]);
    const three = cells(3);
    expect(three[0]).toEqual({ x: 0, y: 0, w: 2 / 3, h: 1 });
    expect(three[1]?.y).toBe(0);
    expect(three[2]?.y).toBe(0.5);
    expect(cells(MAX_PANES)).toHaveLength(4);
    expect(cells(4)[3]).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
    expect(cellAt(2, 1)).toEqual({ x: 0.5, y: 0, w: 0.5, h: 1 });
    expect(cellAt(2, 7)).toEqual(cells(1)[0]);
  });

  it('turns a cell into percentage CSS', () => {
    expect(cellStyle({ x: 0.25, y: 0, w: 0.5, h: 1 })).toEqual({
      left: '25.0000%',
      top: '0.0000%',
      width: '50.0000%',
      height: '100.0000%',
    });
  });

  it('places the menu right of the cell, centred on it and clamped inside the screen', () => {
    const placement = menuPlacement({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, 3);
    expect(placement.left).toBe('min(calc(75.0000% + 2.5rem), calc(100% - 27rem))');
    expect(placement.top).toBe(
      `clamp(2rem, calc(50.0000% - ${(3 * MENU_ROW_REM) / 2}rem), calc(100% - 17rem))`,
    );
    expect(paneFocusId(3)).toBe('multiview-pane-3');
  });
});
