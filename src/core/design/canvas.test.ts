import { describe, expect, it } from 'vitest';
import { canvasDp, dpPx } from './canvas';

describe('canvas', () => {
  it('letterboxes the 960×540 dp reference into landscape viewports', () => {
    expect(dpPx(1920, 1080)).toBe(2);
    expect(dpPx(1280, 720)).toBeCloseTo(4 / 3);
    expect(canvasDp(1920, 1080)).toEqual({ widthDp: 960, heightDp: 540, portrait: false });
    // Ultra-wide: the height pins the scale, the canvas gets wider than 960 dp.
    expect(canvasDp(2560, 1080)).toEqual({ widthDp: 1280, heightDp: 540, portrait: false });
  });

  it('uses a 390 dp-wide canvas in portrait and takes a bottom inset off the height', () => {
    expect(dpPx(390, 844)).toBe(1);
    expect(canvasDp(390, 844)).toEqual({ widthDp: 390, heightDp: 844, portrait: true });
    expect(canvasDp(390, 844, 262)).toEqual({ widthDp: 390, heightDp: 582, portrait: true });
    expect(canvasDp(780, 1688, 2000).heightDp).toBe(0);
  });

  it('falls back to the TV canvas for a zero-sized viewport (jsdom)', () => {
    expect(canvasDp(0, 0)).toEqual({ widthDp: 960, heightDp: 540, portrait: false });
  });
});
