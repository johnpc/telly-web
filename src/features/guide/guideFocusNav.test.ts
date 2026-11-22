import { describe, expect, it } from 'vitest';
import { cellAt, initialFocus, leftOf, resolveFocus, rightOf } from './guideFocusNav';
import { HOUR, MIN, ORIGIN, channel, row } from './testFixtures';

const r = row(channel(1), ORIGIN, 3);
const [a, b, c] = r.cells as [(typeof r.cells)[0], (typeof r.cells)[0], (typeof r.cells)[0]];

describe('guideFocusNav', () => {
  it('steps right and left inside the strip, stopping at the window edge', () => {
    expect(rightOf(r.cells, a)).toBe(b);
    expect(rightOf(r.cells, c)).toBeNull();
    expect(rightOf(r.cells, { ...a, startMs: 1 })).toBeNull();
    expect(leftOf(r.cells, b, ORIGIN)).toBe(a);
    expect(leftOf(r.cells, a, ORIGIN)).toBeNull();
    expect(leftOf(r.cells, { ...b, startMs: ORIGIN + 5 }, ORIGIN)).toBeNull();
  });
  it('picks the cell at an anchor, else the nearest edge', () => {
    expect(cellAt(r.cells, ORIGIN + 90 * MIN)).toBe(b);
    expect(cellAt(r.cells, ORIGIN - HOUR)).toBe(a);
    expect(cellAt(r.cells, ORIGIN + 9 * HOUR)).toBe(c);
    expect(cellAt([], ORIGIN)).toBeNull();
  });
  it('seeds the first row at now and re-resolves by start, then anchor', () => {
    expect(initialFocus([r], ORIGIN + 10 * MIN)).toEqual({
      rowIndex: 0,
      cell: a,
      anchorMs: ORIGIN + 10 * MIN,
    });
    expect(initialFocus([], ORIGIN)).toBeNull();
    const current = { rowIndex: 5, cell: { ...b, program: null }, anchorMs: ORIGIN + 70 * MIN };
    expect(resolveFocus([r], ORIGIN, current)).toEqual({ rowIndex: 0, cell: b, anchorMs: ORIGIN + 70 * MIN });
    const gone = { rowIndex: 0, cell: { ...b, startMs: 5 }, anchorMs: ORIGIN + 2.5 * HOUR };
    expect(resolveFocus([r], ORIGIN, gone)?.cell).toBe(c);
    expect(resolveFocus([{ ...r, cells: [] }], ORIGIN, gone)).toBe(gone);
    expect(resolveFocus([r], ORIGIN + 5, null)?.cell).toBe(a);
  });
});
