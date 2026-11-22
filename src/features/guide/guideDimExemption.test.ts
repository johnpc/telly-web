import { describe, expect, it } from 'vitest';
import { cellActionLabel, sheetFlagsFor, sheetTarget } from './guideCellLabels';
import { bandTopDp } from './guideDimExemption';
import { GRID_TOP_DP } from './guideGeometry';
import { ORIGIN, channel, program, row } from './testFixtures';

describe('bandTopDp', () => {
  const rows = [row(channel(1), ORIGIN, 1), row(channel(2), ORIGIN, 1), row(channel(3), ORIGIN, 1)];
  it('maps the saved channel to its current on-screen band, else null', () => {
    expect(bandTopDp(2, rows, 0, 39)).toBe(GRID_TOP_DP + 39);
    expect(bandTopDp(2, rows, 1, 39)).toBe(GRID_TOP_DP);
    expect(bandTopDp(1, rows, 1, 39)).toBeNull();
    expect(bandTopDp(9, rows, 0, 39)).toBeNull();
    expect(bandTopDp(null, rows, 0, 39)).toBeNull();
    expect(bandTopDp(3, rows, 0, 200)).toBeNull();
  });
});

describe('cellActionLabel', () => {
  it('flips Remind and My list labels off the live key sets', () => {
    const c = channel(1);
    const p = program('c1', ORIGIN, ORIGIN + 1, 'Show');
    const state = {
      channel: c,
      program: p,
      myList: new Set(['c1|' + ORIGIN]),
      reminders: new Set([`1|${ORIGIN}|Show`]),
    };
    expect(cellActionLabel('Remind', state)).toBe('Remove reminder');
    expect(cellActionLabel('Add to My list', state)).toBe('Remove from My list');
    expect(cellActionLabel('Record', state)).toBe('Record');
    expect(cellActionLabel('Remind', { ...state, reminders: new Set() })).toBe('Remind');
    expect(cellActionLabel('Remind', { ...state, program: null })).toBe('Remind');
  });
});

describe('sheetTarget / sheetFlagsFor', () => {
  it('resolves the focused row and the flipping flags', () => {
    const rows = [row(channel(1, { favorite: true }), ORIGIN, 1)];
    const first = rows[0]?.cells[0];
    if (first === undefined) throw new Error('fixture');
    expect(sheetTarget(null, rows)).toBeNull();
    expect(sheetTarget({ rowIndex: 4, cell: first, anchorMs: ORIGIN }, rows)).toBeNull();
    expect(sheetTarget({ rowIndex: 0, cell: first, anchorMs: ORIGIN }, rows)?.row.channel.id).toBe(1);
    expect(sheetFlagsFor(channel(1, { favorite: true }), first.program, new Set([`c1|${ORIGIN}`]))).toEqual({
      favorite: true,
      inMyList: true,
      blocked: false,
    });
    expect(sheetFlagsFor(channel(2), null, new Set())).toEqual({
      favorite: false,
      inMyList: false,
      blocked: false,
    });
  });
});
