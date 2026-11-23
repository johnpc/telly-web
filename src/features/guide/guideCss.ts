/** A CSS font size for `sp` units: viewport-scaled like dp, times the Appearance font scale. */
export function sp(value: number): string {
  return `calc(${value} * var(--dp) * var(--telly-font-scale, 1))`;
}

/** `rgba` black at the sheet scrim's 60 % (round-7 screencap probes: ×0.40). */
export const SCRIM_COLOR = 'rgba(0, 0, 0, 0.6)';

/** Opaque #131619 or the Appearance transparency alpha over the player behind. */
export function guideBackground(alpha: number): string {
  return `rgba(19, 22, 25, ${alpha})`;
}
