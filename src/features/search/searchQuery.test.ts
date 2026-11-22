import { describe, expect, it } from 'vitest';
import { byNameThenNumber, channelMatches, normalizeQuery, numberPrefixMatches } from './searchQuery';

describe('searchQuery', () => {
  it('normalizes whitespace', () => {
    expect(normalizeQuery('  news   one ')).toBe('news one');
    expect(normalizeQuery('   ')).toBe('');
  });

  it('matches channel numbers by prefix only for digits-only queries', () => {
    expect(numberPrefixMatches(2, '2')).toBe(true);
    expect(numberPrefixMatches(24, '2')).toBe(true);
    expect(numberPrefixMatches(12, '2')).toBe(false);
    expect(numberPrefixMatches(2, 'news 2')).toBe(false);
  });

  it('matches channels by name word-prefix or number prefix', () => {
    expect(channelMatches({ name: 'News One Extra', number: 4 }, 'news')).toBe(true);
    expect(channelMatches({ name: 'News One Extra', number: 4 }, 'xtra')).toBe(false);
    expect(channelMatches({ name: 'News One Extra', number: 4 }, 'o')).toBe(true);
    expect(channelMatches({ name: 'Sports Arena', number: 24 }, '2')).toBe(true);
    expect(channelMatches({ name: 'Sports Arena', number: 7 }, 'news')).toBe(false);
  });

  it('orders by case-insensitive name then number', () => {
    const rows = [
      { name: 'news one 2', number: 5 },
      { name: 'News One', number: 9 },
      { name: 'News One', number: 1 },
    ];
    expect(rows.sort(byNameThenNumber).map((r) => `${r.name}#${r.number}`)).toEqual([
      'News One#1',
      'News One#9',
      'news one 2#5',
    ]);
  });
});
