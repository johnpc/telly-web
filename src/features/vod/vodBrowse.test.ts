import { describe, expect, it } from 'vitest';
import { cardFocusId, cards, categories, categoryOf, selectedCategory, UNCATEGORIZED } from './vodBrowse';
import { vodItem } from './vodTestSupport';

const items = [
  vodItem('bunny', { groupTitle: 'Cinema' }),
  vodItem('sintel', { groupTitle: 'Cinema' }),
  vodItem('doc', { groupTitle: 'Documentary' }),
  vodItem('loose', { groupTitle: '  ' }),
  vodItem('none', { groupTitle: null }),
];

describe('vodBrowse', () => {
  it('categories are the distinct group titles in playlist order, blanks uncategorized', () => {
    expect(categories(items)).toEqual(['Cinema', 'Documentary', UNCATEGORIZED]);
    expect(categoryOf(vodItem('x', { groupTitle: null }))).toBe(UNCATEGORIZED);
  });

  it('selectedCategory keeps a live choice and falls back to the first', () => {
    expect(selectedCategory(null, ['A', 'B'])).toBe('A');
    expect(selectedCategory('B', ['A', 'B'])).toBe('B');
    expect(selectedCategory('Gone', ['A', 'B'])).toBe('A');
    expect(selectedCategory('A', [])).toBeNull();
  });

  it('cards filter by category and join stored progress', () => {
    const positions = [
      { itemKey: 'bunny', positionMs: 250, durationMs: 1000, updatedAtMs: 1 },
      { itemKey: 'sintel', positionMs: 5, durationMs: 0, updatedAtMs: 1 },
    ];
    const out = cards(items, 'Cinema', positions);
    expect(out.map((c) => c.item.itemKey)).toEqual(['bunny', 'sintel']);
    expect(out.map((c) => c.progressPermille)).toEqual([250, null]);
    expect(cards(items, null, []).length).toBe(5);
    expect(cards(items, UNCATEGORIZED, []).map((c) => c.item.itemKey)).toEqual(['loose', 'none']);
  });

  it('cardFocusId is keyed by the item key', () => {
    expect(cardFocusId('bunny')).toBe('vod-card-bunny');
  });
});
