import { describe, expect, it } from 'vitest';
import { DAY_MS, DP_PER_MS, HALF_HOUR_MS, TIME_VIEWPORT_DP } from './guideGeometry';
import {
  clamp,
  materializeSpan,
  quantizeDown,
  quantizeUp,
  scrollCeilDp,
  scrollFloorDp,
  visibleSpan,
} from './guideWindowMath';
import { HOUR, MIN, ORIGIN } from './testFixtures';

describe('guideWindowMath', () => {
  it('quantizes onto the origin grid', () => {
    expect(quantizeDown(ORIGIN + 40 * MIN, ORIGIN)).toBe(ORIGIN + HALF_HOUR_MS);
    expect(quantizeDown(ORIGIN - 10 * MIN, ORIGIN)).toBe(ORIGIN - HALF_HOUR_MS);
    expect(quantizeUp(ORIGIN + 40 * MIN, ORIGIN)).toBe(ORIGIN + HOUR);
    expect(quantizeUp(ORIGIN + HOUR, ORIGIN)).toBe(ORIGIN + HOUR);
  });
  it('materializes the visible window plus a 3 h prefetch margin', () => {
    const visible = visibleSpan(ORIGIN, 0, TIME_VIEWPORT_DP);
    expect(visible.fromMs).toBe(ORIGIN);
    expect(visible.toMs).toBe(ORIGIN + Math.trunc(TIME_VIEWPORT_DP / DP_PER_MS));
    const span = materializeSpan(ORIGIN, 0, TIME_VIEWPORT_DP);
    expect(span.fromMs).toBe(ORIGIN - 3 * HOUR);
    expect(span.toMs).toBe(quantizeUp(visible.toMs + 3 * HOUR, ORIGIN));
  });
  it('bounds the scroll by past days and the forward horizon', () => {
    expect(scrollFloorDp(2)).toBe(-2 * DAY_MS * DP_PER_MS);
    expect(scrollCeilDp()).toBe(7 * DAY_MS * DP_PER_MS);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});
