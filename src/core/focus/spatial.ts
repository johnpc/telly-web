// Pure geometry for spatial navigation (Android FocusFinder-style metric):
// a candidate must lie past the current rect's edge in the travel direction;
// candidates overlapping on the cross axis ("in the beam") always beat those
// that do not; among equals, 13·major² + minor² picks the nearest.
import type { Direction } from '../input/remoteKeys';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Candidate {
  id: string;
  rect: Rect;
}

const MAJOR_WEIGHT = 13;
/** Larger than any on-screen distance² so out-of-beam candidates always lose to in-beam ones. */
const OUT_OF_BEAM_PENALTY = 1e12;

/** A rect projected onto the travel axis (`start`/`end`) and the cross axis. */
interface Span {
  start: number;
  end: number;
  crossStart: number;
  crossEnd: number;
}

function span(rect: Rect, horizontal: boolean): Span {
  return horizontal
    ? { start: rect.left, end: rect.right, crossStart: rect.top, crossEnd: rect.bottom }
    : { start: rect.top, end: rect.bottom, crossStart: rect.left, crossEnd: rect.right };
}

function middle(a: number, b: number): number {
  return (a + b) / 2;
}

/** Zero-area rects belong to hidden or detached elements; never navigate to them. */
export function isVisibleRect(rect: Rect): boolean {
  return rect.right > rect.left && rect.bottom > rect.top;
}

/** Both rects projected onto `direction`'s axis, plus the gap along it (negative = not past the edge). */
function project(origin: Rect, target: Rect, direction: Direction): { f: Span; t: Span; major: number } {
  const horizontal = direction === 'LEFT' || direction === 'RIGHT';
  const f = span(origin, horizontal);
  const t = span(target, horizontal);
  const forward = direction === 'RIGHT' || direction === 'DOWN';
  return { f, t, major: forward ? t.start - f.end : f.start - t.end };
}

/**
 * Cost of moving from `origin` to `target` in `direction`; lower is better.
 * Null when `target` is not past `origin`'s edge (touching edges count as past).
 */
export function directionalScore(origin: Rect, target: Rect, direction: Direction): number | null {
  const { f, t, major } = project(origin, target, direction);
  if (major < 0) return null;
  return beamPenalty(f, t) + MAJOR_WEIGHT * major ** 2 + crossOffset(f, t) ** 2;
}

/** 0 when the spans overlap on the cross axis (candidate is "in the beam"), else the penalty. */
function beamPenalty(f: Span, t: Span): number {
  const overlaps = t.crossStart < f.crossEnd && t.crossEnd > f.crossStart;
  return overlaps ? 0 : OUT_OF_BEAM_PENALTY;
}

/** Distance between the spans' cross-axis centres. */
function crossOffset(f: Span, t: Span): number {
  return middle(t.crossStart, t.crossEnd) - middle(f.crossStart, f.crossEnd);
}

/** Squared distance between rect centres. */
export function centerDistance(origin: Rect, target: Rect): number {
  const dx = middle(target.left, target.right) - middle(origin.left, origin.right);
  const dy = middle(target.top, target.bottom) - middle(origin.top, origin.bottom);
  return dx * dx + dy * dy;
}

function pickBest(candidates: readonly Candidate[], score: (rect: Rect) => number | null): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const s = score(candidate.rect);
    if (s !== null && s < bestScore) {
      best = candidate.id;
      bestScore = s;
    }
  }
  return best;
}

/** The best candidate in `direction`, or null when nothing lies that way. */
export function pickInDirection(
  origin: Rect,
  direction: Direction,
  candidates: readonly Candidate[],
): string | null {
  return pickBest(candidates, (rect) => directionalScore(origin, rect, direction));
}

/** The candidate whose centre is nearest to `origin`'s (used when the focused node disappears). */
export function nearestByCenter(origin: Rect, candidates: readonly Candidate[]): string | null {
  return pickBest(candidates, (rect) => centerDistance(origin, rect));
}
