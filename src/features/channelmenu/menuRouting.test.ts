import { describe, expect, it } from 'vitest';
import { GROUP_TOOL_ROUTES, PlayerMenuFocus, routeOf } from './menuRouting';
import { SHEET_ITEMS } from './sheetMenu';

describe('menuRouting', () => {
  it('routes every row (the table is total) and remembers only pushed rows for focus restore', () => {
    expect(routeOf('Search')).toBe('Search');
    expect(routeOf('Group options')).toBe('GroupOptions');
    expect(routeOf('Add to My list')).toBe('MyListToggle');
    expect(new Set(SHEET_ITEMS.map(routeOf)).size).toBe(SHEET_ITEMS.length);
    expect([...GROUP_TOOL_ROUTES]).toHaveLength(6);
    const focus = new PlayerMenuFocus();
    focus.onActivated('Program description');
    expect(focus.restore).toBe('Program description');
    focus.onActivated('Hide channel');
    expect(focus.restore).toBeNull();
    focus.onActivated('Assign EPG');
    expect(focus.restore).toBe('Assign EPG');
    focus.onActivated('Block channel');
    focus.clear();
    expect(focus.restore).toBeNull();
  });
});
