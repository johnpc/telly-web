import { describe, expect, it } from 'vitest';
import { buildCells } from './guideCellsBuilder';
import { HOUR, MIN, ORIGIN, program } from './testFixtures';

describe('buildCells', () => {
  const span = { fromMs: ORIGIN, toMs: ORIGIN + 3 * HOUR };
  it('fills an EPG-less channel with 30-min "No information" cells', () => {
    const cells = buildCells([], span);
    expect(cells).toHaveLength(6);
    expect(cells.every((c) => c.program === null)).toBe(true);
    expect(cells[1]).toMatchObject({ startMs: ORIGIN + 30 * MIN, endMs: ORIGIN + HOUR });
  });
  it('places programmes and fills the gaps around them on the grid', () => {
    const cells = buildCells(
      [program('c1', ORIGIN + 45 * MIN, ORIGIN + 2 * HOUR), program('c1', ORIGIN - HOUR, ORIGIN + 10 * MIN)],
      span,
    );
    expect(cells.map((c) => [c.startMs - ORIGIN, c.endMs - ORIGIN, c.program !== null])).toEqual([
      [-HOUR, 10 * MIN, true],
      [10 * MIN, 30 * MIN, false],
      [30 * MIN, 45 * MIN, false],
      [45 * MIN, 2 * HOUR, true],
      [2 * HOUR, 2.5 * HOUR, false],
      [2.5 * HOUR, 3 * HOUR, false],
    ]);
  });
  it('drops swallowed programmes and ones starting past the span', () => {
    const cells = buildCells(
      [
        program('c1', ORIGIN, ORIGIN + HOUR),
        program('c1', ORIGIN + 30 * MIN, ORIGIN + 40 * MIN),
        program('c1', ORIGIN + 3 * HOUR, ORIGIN + 4 * HOUR),
      ],
      span,
    );
    expect(cells.filter((c) => c.program !== null)).toHaveLength(1);
  });
});
