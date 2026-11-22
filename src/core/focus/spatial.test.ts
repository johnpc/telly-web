import { describe, expect, it } from 'vitest';
import {
  centerDistance,
  directionalScore,
  isVisibleRect,
  nearestByCenter,
  pickInDirection,
  type Candidate,
  type Rect,
} from './spatial';

function rect(x: number, y: number, w = 100, h = 100): Rect {
  return { left: x, top: y, right: x + w, bottom: y + h };
}

const origin = rect(0, 0);

describe('directionalScore', () => {
  it('rejects candidates not past the edge in the travel direction', () => {
    expect(directionalScore(origin, rect(50, 0), 'RIGHT')).toBeNull();
    expect(directionalScore(origin, rect(-50, 0), 'RIGHT')).toBeNull();
    expect(directionalScore(origin, rect(0, 50), 'DOWN')).toBeNull();
    expect(directionalScore(origin, rect(0, -50), 'UP')).toBeNull();
    expect(directionalScore(origin, rect(50, 0), 'LEFT')).toBeNull();
  });

  it('accepts touching edges (adjacent grid cells share an edge)', () => {
    expect(directionalScore(origin, rect(100, 0), 'RIGHT')).toBe(0);
    expect(directionalScore(origin, rect(0, 100), 'DOWN')).toBe(0);
    expect(directionalScore(origin, rect(-100, 0), 'LEFT')).toBe(0);
    expect(directionalScore(origin, rect(0, -100), 'UP')).toBe(0);
  });

  it('weights the travel axis heavier than the cross-axis offset', () => {
    const near = directionalScore(origin, rect(110, 0), 'RIGHT');
    const far = directionalScore(origin, rect(200, 0), 'RIGHT');
    const offset = directionalScore(origin, rect(110, 20), 'RIGHT');
    expect(near).toBeLessThan(far ?? Infinity);
    expect(near).toBeLessThan(offset ?? Infinity);
    expect(offset).toBeLessThan(far ?? Infinity);
  });

  it('always prefers an in-beam candidate over an out-of-beam one', () => {
    const inBeamFar = directionalScore(origin, rect(900, 50), 'RIGHT');
    const outOfBeamNear = directionalScore(origin, rect(110, 150), 'RIGHT');
    expect(inBeamFar).toBeLessThan(outOfBeamNear ?? Infinity);
  });
});

describe('pickInDirection / nearestByCenter', () => {
  const candidates: Candidate[] = [
    { id: 'right', rect: rect(120, 0) },
    { id: 'right-far', rect: rect(300, 0) },
    { id: 'down', rect: rect(0, 120) },
    { id: 'diag', rect: rect(120, 120) },
  ];

  it('picks the nearest candidate in the direction and nothing when none lies that way', () => {
    expect(pickInDirection(origin, 'RIGHT', candidates)).toBe('right');
    expect(pickInDirection(origin, 'DOWN', candidates)).toBe('down');
    expect(pickInDirection(origin, 'LEFT', candidates)).toBeNull();
    expect(pickInDirection(origin, 'UP', [])).toBeNull();
  });

  it('falls back to the nearest out-of-beam candidate when nothing overlaps', () => {
    expect(pickInDirection(rect(0, 300), 'RIGHT', candidates)).toBe('diag');
  });

  it('finds the nearest centre', () => {
    expect(nearestByCenter(rect(110, 110), candidates)).toBe('diag');
    expect(nearestByCenter(origin, [])).toBeNull();
    expect(centerDistance(origin, rect(30, 40))).toBe(2500);
  });
});

describe('isVisibleRect', () => {
  it('is false for zero-area rects', () => {
    expect(isVisibleRect(rect(0, 0))).toBe(true);
    expect(isVisibleRect(rect(0, 0, 0, 0))).toBe(false);
    expect(isVisibleRect(rect(5, 5, 10, 0))).toBe(false);
  });
});
