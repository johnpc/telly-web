import { describe, expect, it } from 'vitest';
import { dp, halfHourFloor, timeAt, widthOf, xOf } from './guideGeometry';
import { HOUR, MIN, ORIGIN } from './testFixtures';

describe('guideGeometry', () => {
  it('floors to the local half hour', () => {
    expect(halfHourFloor(ORIGIN + 17 * MIN)).toBe(ORIGIN);
    expect(halfHourFloor(ORIGIN + 44 * MIN)).toBe(ORIGIN + 30 * MIN);
  });
  it('maps time to 160 dp per half hour and back', () => {
    expect(xOf(ORIGIN + HOUR, ORIGIN)).toBe(320);
    expect(timeAt(320, ORIGIN)).toBe(ORIGIN + HOUR);
    expect(widthOf(ORIGIN, ORIGIN + 30 * MIN)).toBe(160);
    expect(dp(10)).toBe('calc(10 * var(--dp))');
  });
});
