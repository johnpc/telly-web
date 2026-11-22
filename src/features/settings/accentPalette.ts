/**
 * Accent choices behind Settings -> Appearance -> "Color theme" (port of
 * Android `AccentPalette.kt`): the Material-500 palette; the default Blue is
 * the sampled TiviMate accent #2196F3.
 */
export interface AccentOption {
  name: string;
  hex: string;
}

export const DEFAULT_ACCENT: AccentOption = { name: 'Blue', hex: '#2196f3' };

export const ACCENT_OPTIONS: readonly AccentOption[] = [
  DEFAULT_ACCENT,
  { name: 'Red', hex: '#f44336' },
  { name: 'Pink', hex: '#e91e63' },
  { name: 'Purple', hex: '#9c27b0' },
  { name: 'Indigo', hex: '#3f51b5' },
  { name: 'Cyan', hex: '#00bcd4' },
  { name: 'Teal', hex: '#009688' },
  { name: 'Green', hex: '#4caf50' },
  { name: 'Amber', hex: '#ffc107' },
  { name: 'Orange', hex: '#ff9800' },
];

export function accentHexFor(name: string): string {
  return ACCENT_OPTIONS.find((option) => option.name === name)?.hex ?? DEFAULT_ACCENT.hex;
}

export function accentNames(): string[] {
  return ACCENT_OPTIONS.map((option) => option.name);
}

/** The captured value renders as "Dark  •  <accent>" (double spaces). */
export function themeLabel(accent: string): string {
  return `Dark  •  ${accent}`;
}
