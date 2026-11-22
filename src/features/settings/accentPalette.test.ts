import { describe, expect, it } from 'vitest';
import { accentHexFor, accentNames, themeLabel } from './accentPalette';
import { keymapChoice } from './keymapOptions';

describe('AccentPalette', () => {
  it('maps names to Material hexes with Blue as the fallback', () => {
    expect(accentHexFor('Red')).toBe('#f44336');
    expect(accentHexFor('Nope')).toBe('#2196f3');
    expect(accentNames()[0]).toBe('Blue');
    expect(themeLabel('Teal')).toBe('Dark  •  Teal');
  });

  it('falls back to the default keymap label for unknown raws', () => {
    expect(keymapChoice('Nothing', ['Show info panel', 'Nothing'], 'Show info panel')).toBe('Nothing');
    expect(keymapChoice('???', ['Show info panel', 'Nothing'], 'Show info panel')).toBe('Show info panel');
  });
});
