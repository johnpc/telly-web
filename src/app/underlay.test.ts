import { describe, expect, it } from 'vitest';
import { mutedKeyRouter, stackLayers, underlayOf } from './underlay';

describe('underlayOf', () => {
  it('keeps the route beneath Settings mounted and nothing else', () => {
    expect(underlayOf([{ kind: 'Guide' }, { kind: 'Settings' }])).toEqual({ kind: 'Guide' });
    expect(underlayOf([{ kind: 'Guide' }, { kind: 'Playback' }, { kind: 'Settings' }])).toEqual({
      kind: 'Playback',
    });
    expect(underlayOf([{ kind: 'Guide' }, { kind: 'Playback' }])).toBeNull();
    expect(underlayOf([{ kind: 'Settings' }])).toBeNull();
    expect(underlayOf([])).toBeNull();
  });
});

describe('mutedKeyRouter', () => {
  it('accepts handlers but consumes nothing', () => {
    const router = mutedKeyRouter();
    let seen = 0;
    router.push(() => {
      seen += 1;
      return true;
    });
    expect(router.depth).toBe(1);
    const fresh = mutedKeyRouter();
    expect(fresh.dispatch('LEFT')).toBe(false);
    expect(fresh.dispatch('OK')).toBe(false);
    expect(fresh.dispatch('BACK')).toBe(true);
    expect(fresh.dispatch('MENU')).toBe(false);
    expect(seen).toBe(0);
  });
});

describe('stackLayers', () => {
  it('renders the top route alone, or the sheet over an inert base', () => {
    expect(stackLayers([{ kind: 'Guide' }])).toEqual({
      top: { kind: 'Guide' },
      base: { kind: 'Guide' },
      inert: false,
    });
    expect(stackLayers([{ kind: 'Guide' }, { kind: 'Settings' }])).toEqual({
      top: { kind: 'Settings' },
      base: { kind: 'Guide' },
      inert: true,
    });
    expect(stackLayers([]).top).toEqual({ kind: 'Boot' });
  });
});
