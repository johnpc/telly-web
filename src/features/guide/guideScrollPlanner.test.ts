import { describe, expect, it } from 'vitest';
import { TIME_VIEWPORT_DP } from './guideGeometry';
import { horizontalTarget, rowWindow } from './guideScrollPlanner';
import { HOUR, ORIGIN, cell } from './testFixtures';

describe('guideScrollPlanner', () => {
  it('pans so the cell start stays in view', () => {
    expect(horizontalTarget(cell(ORIGIN - HOUR, ORIGIN), ORIGIN, 0, TIME_VIEWPORT_DP)).toBe(-320);
    expect(horizontalTarget(cell(ORIGIN + 3 * HOUR, ORIGIN + 4 * HOUR), ORIGIN, 0, TIME_VIEWPORT_DP)).toBe(
      590,
    );
    expect(horizontalTarget(cell(ORIGIN + 2 * HOUR, ORIGIN + 12 * HOUR), ORIGIN, 0, TIME_VIEWPORT_DP)).toBe(
      640,
    );
    expect(horizontalTarget(cell(ORIGIN, ORIGIN + HOUR), ORIGIN, 0, TIME_VIEWPORT_DP)).toBe(0);
  });
  it('keeps the focused row inside the row window', () => {
    expect(rowWindow(0, 3, 7, 31)).toBe(0);
    expect(rowWindow(0, 9, 7, 31)).toBe(3);
    expect(rowWindow(5, 2, 7, 31)).toBe(2);
    expect(rowWindow(0, 30, 7, 31)).toBe(24);
    expect(rowWindow(0, 2, 7, 3)).toBe(0);
  });
});
