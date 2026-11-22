import { describe, expect, it } from 'vitest';
import { TIME_VIEWPORT_DP } from './guideGeometry';
import { CLOCK_12H } from './guideTimes';
import { nowLineOffset, ticks } from './guideTimeline';
import { HOUR, MIN, ORIGIN } from './testFixtures';

describe('guideTimeline', () => {
  it('lists a label every 30 minutes across the viewport', () => {
    const labels = ticks(ORIGIN, 0, TIME_VIEWPORT_DP, CLOCK_12H);
    expect(labels.map((t) => t.offsetDp)).toEqual([0, 160, 320, 480, 640]);
    expect(labels[0]?.label).toBe('12:00 PM');
    const scrolled = ticks(ORIGIN, 100, TIME_VIEWPORT_DP, CLOCK_12H);
    expect(scrolled[0]?.offsetDp).toBe(60);
  });
  it('places the now-line only while it is inside the viewport', () => {
    expect(nowLineOffset(ORIGIN + 15 * MIN, ORIGIN, 0, TIME_VIEWPORT_DP)).toBe(80);
    expect(nowLineOffset(ORIGIN - HOUR, ORIGIN, 0, TIME_VIEWPORT_DP)).toBeNull();
  });
});
