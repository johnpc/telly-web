import { beforeEach, describe, expect, it } from 'vitest';
import type { EngineStateKind } from './engineState';
import { BUFFERING_TICKS, FROZEN_TICKS, StallDetector, type StallSample } from './stallDetector';

function sample(state: EngineStateKind, positionMs: number, playWhenReady = true): StallSample {
  return { state, playWhenReady, positionMs };
}

describe('StallDetector', () => {
  let detector: StallDetector;

  beforeEach(() => {
    detector = new StallDetector(3, 4);
  });

  it('has the Android thresholds by default', () => {
    expect(FROZEN_TICKS).toBe(5);
    expect(BUFFERING_TICKS).toBe(15);
  });

  it('a frozen position while playing fires after the frozen threshold', () => {
    expect(detector.onSample(sample('Playing', 42))).toBe(false);
    expect(detector.onSample(sample('Playing', 42))).toBe(false);
    expect(detector.mode).toEqual({ kind: 'FrozenRun', run: 1 });
    expect(detector.onSample(sample('Playing', 42))).toBe(false);
    expect(detector.onSample(sample('Playing', 42))).toBe(true);
  });

  it('an advancing position never fires', () => {
    let position = 0;
    for (let i = 0; i < 20; i += 1) {
      position += 2_000;
      expect(detector.onSample(sample('Playing', position))).toBe(false);
    }
    expect(detector.mode).toEqual({ kind: 'Healthy' });
  });

  it('a user pause is never a stall', () => {
    for (let i = 0; i < 20; i += 1) expect(detector.onSample(sample('Playing', 42, false))).toBe(false);
  });

  it('movement resets the frozen count', () => {
    for (let i = 0; i < 3; i += 1) detector.onSample(sample('Playing', 42));
    expect(detector.onSample(sample('Playing', 43))).toBe(false);
    for (let i = 0; i < 2; i += 1) expect(detector.onSample(sample('Playing', 43))).toBe(false);
    expect(detector.onSample(sample('Playing', 43))).toBe(true);
  });

  it('never-ending buffering fires after its own longer threshold', () => {
    for (let i = 0; i < 3; i += 1) expect(detector.onSample(sample('Buffering', 0))).toBe(false);
    expect(detector.mode).toEqual({ kind: 'BufferingRun', run: 3 });
    expect(detector.onSample(sample('Buffering', 0))).toBe(true);
  });

  it('buffering that resolves to playing resets', () => {
    for (let i = 0; i < 3; i += 1) detector.onSample(sample('Buffering', 0));
    expect(detector.onSample(sample('Playing', 1_000))).toBe(false);
    for (let i = 0; i < 3; i += 1) expect(detector.onSample(sample('Buffering', 1_000))).toBe(false);
    expect(detector.onSample(sample('Buffering', 1_000))).toBe(true);
  });

  it('idle, ended, error and reconnecting states never fire', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(detector.onSample(sample('Idle', 0))).toBe(false);
      expect(detector.onSample(sample('Ended', 0))).toBe(false);
      expect(detector.onSample(sample('Error', 0))).toBe(false);
      expect(detector.onSample(sample('Reconnecting', 0))).toBe(false);
    }
  });

  it('after firing the count restarts instead of firing every tick', () => {
    for (let i = 0; i < 3; i += 1) detector.onSample(sample('Playing', 42));
    expect(detector.onSample(sample('Playing', 42))).toBe(true);
    for (let i = 0; i < 2; i += 1) expect(detector.onSample(sample('Playing', 42))).toBe(false);
    expect(detector.onSample(sample('Playing', 42))).toBe(true);
  });
});
