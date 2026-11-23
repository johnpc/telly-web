import { describe, expect, it } from 'vitest';
import type { KeyHold } from '@/core/input/keyQueue';
import { holdsKey } from './useDeferredDown';

describe('holdsKey', () => {
  it('holds a DOWN from the bar only while a search is pending, then every direction until replay', () => {
    const open: KeyHold = { kind: 'Holding', keys: [] };
    const continuing: KeyHold = { kind: 'Holding', keys: ['DOWN'] };
    expect(holdsKey('DOWN', 'search-query', open)).toBe(true);
    expect(holdsKey('RIGHT', 'search-query', continuing)).toBe(true);
    expect(holdsKey('RIGHT', 'search-query', open)).toBe(false);
    expect(holdsKey('DOWN', 'search-orb', open)).toBe(false);
    expect(holdsKey('DOWN', 'search-query', { kind: 'Live' })).toBe(false);
    expect(holdsKey('OK', 'search-query', continuing)).toBe(false);
  });
});
