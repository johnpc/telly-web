import { describe, expect, it } from 'vitest';
import { MENU, MENU_LABELS, PANES, menuRows, picker } from './multiviewLayer';

describe('multiviewLayer', () => {
  it('lists the captured rows, hiding Remove at one pane and the add rows at the cap', () => {
    expect(menuRows(1, 4)).toEqual(['ADD_SCREEN', 'SEARCH_AND_ADD', 'CHANGE_CHANNEL']);
    expect(menuRows(2, 4)).toEqual(['ADD_SCREEN', 'SEARCH_AND_ADD', 'CHANGE_CHANNEL', 'REMOVE_SCREEN']);
    expect(menuRows(4, 4)).toEqual(['CHANGE_CHANNEL', 'REMOVE_SCREEN']);
    expect(menuRows(1, 4).map((a) => MENU_LABELS[a])).toEqual([
      'Add screen',
      'Search and add',
      'Change channel',
    ]);
    expect(MENU_LABELS.REMOVE_SCREEN).toBe('Remove screen');
  });

  it('builds the layer values', () => {
    expect(PANES).toEqual({ kind: 'Panes' });
    expect(MENU).toEqual({ kind: 'Menu' });
    expect(picker('CHANGE')).toEqual({ kind: 'Picker', mode: 'CHANGE' });
  });
});
