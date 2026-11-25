import { describe, expect, it } from 'vitest';
import { FrameRateEstimator } from './frameRateEstimator';

describe('FrameRateEstimator', () => {
  it('estimates 25 fps from 40 ms presentation deltas once enough samples agree, then goes quiet', () => {
    const estimator = new FrameRateEstimator(4);
    const results = [0, 40_000, 80_000, 120_000, 160_000, 200_000].map((us) => estimator.onFrame(us));
    expect(results).toEqual([null, null, null, null, 25, null]);
  });

  it('the median shrugs off a single late frame', () => {
    const estimator = new FrameRateEstimator(5);
    const times = [0, 40_000, 80_000, 200_000, 240_000, 280_000];
    const fps = times.map((us) => estimator.onFrame(us)).find((r) => r !== null);
    expect(fps).toBe(25);
  });

  it('a backwards or repeated timestamp restarts the window', () => {
    const estimator = new FrameRateEstimator(3);
    expect(estimator.onFrame(0)).toBeNull();
    expect(estimator.onFrame(40_000)).toBeNull();
    expect(estimator.onFrame(80_000)).toBeNull();
    expect(estimator.onFrame(10_000)).toBeNull();
    expect(estimator.onFrame(43_333)).toBeNull();
    expect(estimator.onFrame(76_666)).toBeNull();
    expect(estimator.onFrame(110_000)).toBeCloseTo(30, 0);
  });
});
