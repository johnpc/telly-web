import { describe, expect, it } from 'vitest';
import { TV_DIMS, dimsFor, dp, halfHourFloor, timeAt, widthOf, xOf } from './guideGeometry';
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

describe('dimsFor', () => {
  it('reproduces the 1080p reference on a 16:9 canvas and widens on ultra-wide / tall canvases', () => {
    expect(dimsFor({ widthDp: 960, heightDp: 540, portrait: false })).toEqual(TV_DIMS);
    const wide = dimsFor({ widthDp: 1280, heightDp: 540, portrait: false });
    expect(wide.timeViewportDp).toBe(1010);
    expect(wide.channelColumnDp).toBe(270);
    expect(wide.gridRows).toBe(7);
  });

  it('degrades a portrait phone to a narrow channel column, a compact top strip and as many rows as fit', () => {
    const phone = dimsFor({ widthDp: 390, heightDp: 582, portrait: true });
    expect(phone).toEqual({
      channelColumnDp: 170,
      timeViewportDp: 220,
      gridTopDp: 150,
      gridRows: 11,
      compact: true,
    });
    expect(dimsFor({ widthDp: 200, heightDp: 100, portrait: true }).timeViewportDp).toBe(160);
    expect(dimsFor({ widthDp: 200, heightDp: 100, portrait: true }).gridRows).toBe(7);
  });
});
