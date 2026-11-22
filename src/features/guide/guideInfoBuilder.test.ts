import { describe, expect, it } from 'vitest';
import { buildInfo, infoFor } from './guideInfoBuilder';
import { CLOCK_12H } from './guideTimes';
import { HOUR, MIN, ORIGIN, channel, row } from './testFixtures';

describe('guideInfoBuilder', () => {
  const r = row(channel(1, { favorite: true, groupTitle: 'News' }), ORIGIN, 2);
  it('builds the airing cell with remaining minutes and progress', () => {
    const first = r.cells[0];
    if (first === undefined) throw new Error('fixture');
    const info = buildInfo(r, first, ORIGIN + 30 * MIN, CLOCK_12H);
    expect(info).toMatchObject({
      title: 'Show',
      remaining: '30 min',
      progressPermille: 500,
      description: 'About it',
      group: 'News',
      favorite: true,
    });
    expect(info.range).toMatch(/— /);
  });
  it('omits the pill for non-airing cells and falls back to No information', () => {
    const second = r.cells[1];
    if (second === undefined) throw new Error('fixture');
    expect(buildInfo(r, second, ORIGIN, CLOCK_12H)).toMatchObject({
      remaining: null,
      progressPermille: null,
    });
    expect(
      buildInfo(r, { startMs: ORIGIN, endMs: ORIGIN + HOUR, program: null }, ORIGIN, CLOCK_12H).title,
    ).toBe('No information');
    expect(infoFor([r], { rowIndex: 0, cell: second, anchorMs: ORIGIN }, ORIGIN, CLOCK_12H)?.title).toBe(
      'Show',
    );
    expect(infoFor([r], null, ORIGIN, CLOCK_12H)).toBeNull();
    expect(infoFor([], { rowIndex: 3, cell: second, anchorMs: ORIGIN }, ORIGIN, CLOCK_12H)).toBeNull();
  });
});
