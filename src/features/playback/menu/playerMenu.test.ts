import { describe, expect, it } from 'vitest';
import { menuLabel, menuSections, NO_INFORMATION, PLAYER_MENU_ITEMS } from './playerMenu';
import { PlayerMenuFocus, routeOf } from './playerMenuRouting';

describe('playerMenu', () => {
  it('builds the four verbatim sections and flips the toggling labels', () => {
    const sections = menuSections(null, 'News One');
    expect(sections.map((s) => s.header)).toEqual([null, NO_INFORMATION, 'News One', 'All channels']);
    expect(sections.flatMap((s) => s.items)).toEqual([...PLAYER_MENU_ITEMS]);
    expect(menuSections('Show', 'X')[1]?.header).toBe('Show');
    expect(menuLabel('Add to Favorites', { favorite: true, blocked: false })).toBe('Remove from Favorites');
    expect(menuLabel('Block channel', { favorite: false, blocked: true })).toBe('Unblock channel');
    expect(menuLabel('Hide channel', { favorite: true, blocked: true })).toBe('Hide channel');
  });

  it('routes every row and remembers only pushed rows for focus restore', () => {
    expect(routeOf('Search')).toBe('Search');
    expect(routeOf('Group options')).toBe('ComingSoon');
    expect(PLAYER_MENU_ITEMS.every((item) => routeOf(item) !== undefined)).toBe(true);
    const focus = new PlayerMenuFocus();
    focus.onActivated('Program description');
    expect(focus.restore).toBe('Program description');
    focus.onActivated('Hide channel');
    expect(focus.restore).toBeNull();
    focus.onActivated('Block channel');
    focus.clear();
    expect(focus.restore).toBeNull();
  });
});
