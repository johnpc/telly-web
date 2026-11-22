import { describe, expect, it } from 'vitest';
import { MENU_WIDTH_DP, dropdownAnchor } from './guideDropdownAnchor';
import { CHANNEL_COLUMN_DP, GRID_HEIGHT_DP, TIME_VIEWPORT_DP } from './guideGeometry';
import { HOUR, ORIGIN, cell } from './testFixtures';

describe('dropdownAnchor', () => {
  it('hangs the menu under its cell and clamps it inside the grid', () => {
    const focus = { rowIndex: 0, cell: cell(ORIGIN + HOUR, ORIGIN + 2 * HOUR), anchorMs: ORIGIN };
    expect(dropdownAnchor(focus, 0, ORIGIN, 0, 39)).toEqual({ xDp: CHANNEL_COLUMN_DP + 320, yDp: 39 });
    const far = { ...focus, rowIndex: 6, cell: cell(ORIGIN + 10 * HOUR, ORIGIN + 11 * HOUR) };
    expect(dropdownAnchor(far, 0, ORIGIN, 0, 39)).toEqual({
      xDp: CHANNEL_COLUMN_DP + TIME_VIEWPORT_DP - MENU_WIDTH_DP,
      yDp: GRID_HEIGHT_DP - 6 * 39,
    });
  });
});
