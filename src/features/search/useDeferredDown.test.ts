import { describe, expect, it } from 'vitest';
import { holdsKey } from './useDeferredDown';

describe('holdsKey', () => {
  it('holds a DOWN from the bar only while a search is pending, then every direction until replay', () => {
    expect(holdsKey('DOWN', true, 'search-query', 0)).toBe(true);
    expect(holdsKey('RIGHT', true, 'search-query', 1)).toBe(true);
    expect(holdsKey('RIGHT', true, 'search-query', 0)).toBe(false);
    expect(holdsKey('DOWN', true, 'search-orb', 0)).toBe(false);
    expect(holdsKey('DOWN', false, 'search-query', 0)).toBe(false);
    expect(holdsKey('OK', true, 'search-query', 1)).toBe(false);
  });
});
