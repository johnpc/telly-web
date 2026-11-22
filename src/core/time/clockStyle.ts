/**
 * How clock/time strings render: the persisted 12/24-hour choice
 * (Appearance → "Clock format", captured default "12-hour") plus an optional
 * IANA zone so tests stay deterministic (Android `ClockStyle`).
 */
export interface ClockStyle {
  readonly is24h: boolean;
  readonly timeZone?: string;
}

export const CLOCK_12H: ClockStyle = { is24h: false };
export const CLOCK_24H: ClockStyle = { is24h: true };
/** Aliases kept for the slices that named the default differently. */
export const TWELVE_HOUR: ClockStyle = CLOCK_12H;
export const DEFAULT_CLOCK_STYLE: ClockStyle = CLOCK_12H;

/** True for the "24-hour" raw setting value; anything else is 12-hour. */
export function is24Raw(raw: string): boolean {
  return raw.trim().startsWith('24');
}

export function clockStyleOf(raw: string, timeZone?: string): ClockStyle {
  return timeZone === undefined ? { is24h: is24Raw(raw) } : { is24h: is24Raw(raw), timeZone };
}
