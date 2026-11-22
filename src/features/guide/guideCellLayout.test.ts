import { describe, expect, it } from 'vitest';
import { MIN_CELL_DP, placeCell } from './guideCellLayout';
import { TIME_VIEWPORT_DP } from './guideGeometry';
import { HOUR, MIN, ORIGIN, cell } from './testFixtures';

describe('placeCell', () => {
  it('clamps a running programme to the left edge and keeps it labelled', () => {
    const placed = placeCell(cell(ORIGIN - HOUR, ORIGIN + 30 * MIN), ORIGIN, 0, TIME_VIEWPORT_DP);
    expect(placed).toEqual({ offsetDp: 0, widthDp: 160, clipped: true });
  });
  it('clamps widths to the viewport and hides off-screen cells', () => {
    expect(placeCell(cell(ORIGIN, ORIGIN + 10 * HOUR), ORIGIN, 0, TIME_VIEWPORT_DP)?.widthDp).toBe(
      TIME_VIEWPORT_DP,
    );
    expect(placeCell(cell(ORIGIN - 2 * HOUR, ORIGIN - HOUR), ORIGIN, 0, TIME_VIEWPORT_DP)).toBeNull();
    expect(placeCell(cell(ORIGIN + 10 * HOUR, ORIGIN + 11 * HOUR), ORIGIN, 0, TIME_VIEWPORT_DP)).toBeNull();
    expect(placeCell(cell(ORIGIN, ORIGIN + 1), ORIGIN, 0, TIME_VIEWPORT_DP)?.widthDp).toBe(MIN_CELL_DP);
  });
});
