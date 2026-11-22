import { describe, expect, it } from 'vitest';
import { GuideFocusEngine } from './guideFocusEngine';
import { DAY_MS, DP_PER_30_MIN, DP_PER_MS, TIME_VIEWPORT_DP } from './guideGeometry';
import { scrollCeilDp, scrollFloorDp } from './guideWindowMath';
import { HOUR, MIN, ORIGIN, channel, row } from './testFixtures';

const rows = [row(channel(1), ORIGIN, 12), row(channel(2), ORIGIN, 12), row(channel(3), ORIGIN, 12)];

function make(): GuideFocusEngine {
  const engine = new GuideFocusEngine(
    ORIGIN,
    () => scrollFloorDp(2),
    () => 2,
  );
  engine.ensureFocus(rows, ORIGIN + 10 * MIN);
  return engine;
}

describe('GuideFocusEngine', () => {
  it('seeds focus at now and keeps the anchor across vertical moves', () => {
    const engine = make();
    expect(engine.focus).toMatchObject({ rowIndex: 0, anchorMs: ORIGIN + 10 * MIN });
    engine.moveVertical(rows, 1);
    expect(engine.focus?.rowIndex).toBe(1);
    engine.moveVertical(rows, 5);
    expect(engine.focus?.rowIndex).toBe(2);
    expect(engine.firstRow).toBe(1);
    engine.moveVertical(rows, 9);
    expect(engine.focus?.rowIndex).toBe(2);
    engine.moveVertical([], 1);
    engine.ensureFocus([], ORIGIN);
    expect(engine.focus).toBeNull();
    engine.moveVertical(rows, 1);
    expect(engine.focus).toBeNull();
  });
  it('moves right with lockstep scroll and never pans left of now by plain moves', () => {
    const engine = make();
    let notified = 0;
    engine.subscribe(() => (notified += 1));
    for (let i = 0; i < 3; i += 1) engine.moveRight(rows);
    expect(engine.focus?.cell.startMs).toBe(ORIGIN + 3 * HOUR);
    expect(engine.scrollX).toBe(4 * 320 - TIME_VIEWPORT_DP);
    expect(notified).toBe(3);
    expect(engine.moveLeft(rows)).toBe(true);
    expect(engine.focus?.anchorMs).toBe(
      Math.max(ORIGIN + 2 * HOUR, ORIGIN + Math.trunc(engine.scrollX / DP_PER_MS)),
    );
    while (engine.moveLeft(rows)) {
      /* walk back until a cell sits flush with the window's left edge */
    }
    expect(engine.scrollX).toBe(320);
    expect(engine.focus?.cell.startMs).toBe(ORIGIN + HOUR);
    expect(engine.moveLeft(rows)).toBe(false);
    engine.reset();
    expect(engine.moveLeft(rows)).toBe(false);
    engine.moveRight(rows);
    expect(engine.scrollX).toBe(0);
  });
  it('pans the window on at the materialized edge', () => {
    const engine = make();
    for (let i = 0; i < 11; i += 1) engine.moveRight(rows);
    const before = engine.scrollX;
    engine.moveRight(rows);
    expect(engine.scrollX).toBe(before + DP_PER_30_MIN);
  });
  it('day-jumps within the past/forward bounds and re-aligns the window', () => {
    const engine = make();
    engine.dayJump(-1, 2);
    expect(engine.focus?.anchorMs).toBe(ORIGIN + 10 * MIN - DAY_MS);
    expect(engine.scrollX).toBe(-DAY_MS * DP_PER_MS);
    engine.dayJump(-5, 2);
    expect(engine.scrollX).toBe(scrollFloorDp(2));
    engine.dayJump(30, 2);
    expect(engine.scrollX).toBe(scrollCeilDp());
    engine.reset();
    engine.dayJump(1, 2);
    expect(engine.scrollX).toBe(0);
  });
  it('page-jumps a whole viewport and reports the edge', () => {
    const engine = make();
    expect(engine.pageJump(rows, -1)).toBe(false);
    expect(engine.pageJump(rows, 1)).toBe(true);
    expect(engine.scrollX).toBe(TIME_VIEWPORT_DP);
    expect(engine.focus?.anchorMs).toBe(ORIGIN + 10 * MIN + Math.trunc(TIME_VIEWPORT_DP / DP_PER_MS));
    engine.reset();
    expect(engine.pageJump(rows, 1)).toBe(false);
  });
});
