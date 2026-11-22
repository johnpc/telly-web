import { describe, expect, it } from 'vitest';
import { GROUP_TOOL_ITEMS, SHEET_ITEMS, sheetLabel, sheetSections } from './sheetMenu';

describe('sheetMenu', () => {
  it('lists the four captured sections verbatim', () => {
    const sections = sheetSections('Show: Ep', 'News One');
    expect(sections.map((s) => s.header)).toEqual([null, 'Show: Ep', 'News One', 'All channels']);
    expect(sections.flatMap((s) => [...s.items])).toEqual([...SHEET_ITEMS]);
    expect(sheetSections(null, 'X')[1]?.header).toBe('No information');
    expect(GROUP_TOOL_ITEMS.size).toBe(6);
  });
  it('flips the state-dependent labels', () => {
    const off = { favorite: false, inMyList: false, blocked: false };
    const on = { favorite: true, inMyList: true, blocked: true };
    expect(sheetLabel('Add to Favorites', off)).toBe('Add to Favorites');
    expect(sheetLabel('Add to Favorites', on)).toBe('Remove from Favorites');
    expect(sheetLabel('Add to My list', on)).toBe('Remove from My list');
    expect(sheetLabel('Block channel', on)).toBe('Unblock channel');
    expect(sheetLabel('Search', on)).toBe('Search');
  });
});
