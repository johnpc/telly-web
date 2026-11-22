import { describe, expect, it } from 'vitest';
import { boolSetting, intSetting, stringSetSetting, stringSetting } from './setting';

describe('setting codecs (Android-compatible encodings)', () => {
  it('bool is strict: only "true"/"false" decode, junk falls back to the default', () => {
    const s = boolSetting('k', true);
    expect(s.encode(false)).toBe('false');
    expect(s.decode('false')).toBe(false);
    expect(s.decode('true')).toBe(true);
    expect(s.decode('TRUE')).toBe(true);
    expect(s.decode('yes')).toBe(true);
  });

  it('int accepts signed digit runs only', () => {
    const s = intSetting('k', 7);
    expect(s.encode(12)).toBe('12');
    expect(s.decode('12')).toBe(12);
    expect(s.decode('-3')).toBe(-3);
    expect(s.decode('+4')).toBe(4);
    expect(s.decode('1.5')).toBe(7);
    expect(s.decode('abc')).toBe(7);
    expect(s.decode('99999999999999999999')).toBe(7);
  });

  it('string passes through', () => {
    const s = stringSetting('k', 'd');
    expect(s.default).toBe('d');
    expect(s.decode(s.encode('x'))).toBe('x');
  });

  it('string sets are newline-joined and drop empty lines', () => {
    const s = stringSetSetting('k');
    expect(s.default.size).toBe(0);
    expect(s.encode(new Set(['News', 'Kids']))).toBe('News\nKids');
    expect([...s.decode('News\n\nKids\n')]).toEqual(['News', 'Kids']);
  });
});
