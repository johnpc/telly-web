import { describe, expect, it } from 'vitest';
import {
  airTimeText,
  clockStyleOf,
  clockText,
  progressPermille,
  rangeText,
  remainingMinutes,
  sameLocalDay,
  startTimeText,
  TWELVE_HOUR,
} from './programTimes';

const H24 = { is24h: true };
// Local-zone instants built from components so the strings are zone-independent.
const at = (y: number, m: number, d: number, h: number, min: number): number =>
  new Date(y, m - 1, d, h, min, 0, 0).getTime();

describe('programTimes', () => {
  it('renders ranges with the start meridiem only when it differs', () => {
    expect(rangeText(at(2026, 9, 13, 14, 30), at(2026, 9, 13, 15, 45), TWELVE_HOUR)).toBe('02:30 — 03:45 PM');
    expect(rangeText(at(2026, 9, 13, 11, 30), at(2026, 9, 13, 12, 15), TWELVE_HOUR)).toBe(
      '11:30 AM — 12:15 PM',
    );
    expect(rangeText(at(2026, 9, 13, 0, 5), at(2026, 9, 13, 0, 50), TWELVE_HOUR)).toBe('12:05 — 12:50 AM');
    expect(rangeText(at(2026, 9, 13, 14, 30), at(2026, 9, 13, 15, 45), H24)).toBe('14:30 — 15:45');
  });

  it('renders the clock stamp and bare start times in both styles', () => {
    expect(clockText(at(2026, 9, 13, 14, 45))).toBe('Sun, Sep 13, 2:45 PM');
    expect(clockText(at(2026, 9, 13, 14, 45), H24)).toBe('Sun, Sep 13, 14:45');
    expect(clockText(at(2026, 9, 14, 0, 5))).toBe('Mon, Sep 14, 12:05 AM');
    expect(startTimeText(at(2026, 9, 14, 0, 45))).toBe('12:45 AM');
    expect(startTimeText(at(2026, 9, 14, 0, 45), H24)).toBe('00:45');
  });

  it('prefixes the day only for programmes not starting today', () => {
    const now = at(2026, 9, 13, 14, 0);
    expect(airTimeText(at(2026, 9, 13, 15, 45), at(2026, 9, 13, 17, 15), now, TWELVE_HOUR)).toBe(
      '03:45 — 05:15 PM',
    );
    expect(airTimeText(at(2026, 9, 14, 0, 45), at(2026, 9, 14, 1, 45), now, TWELVE_HOUR)).toBe(
      'Mon, Sep 14, 12:45 — 01:45 AM',
    );
    expect(sameLocalDay(now, at(2026, 9, 13, 23, 59))).toBe(true);
    expect(sameLocalDay(now, at(2026, 9, 14, 0, 0))).toBe(false);
  });

  it('computes remaining minutes (rounded up) and clamped progress', () => {
    expect(remainingMinutes(1_000_000 + 60_001, 1_000_000)).toBe(2);
    expect(remainingMinutes(1_000, 2_000)).toBe(0);
    expect(progressPermille(0, 1000, 500)).toBe(500);
    expect(progressPermille(0, 1000, 1500)).toBe(1000);
    expect(progressPermille(0, 1000, -5)).toBe(0);
    expect(progressPermille(5, 5, 5)).toBe(0);
  });

  it('decodes the persisted clock format', () => {
    expect(clockStyleOf('24-hour').is24h).toBe(true);
    expect(clockStyleOf('12-hour').is24h).toBe(false);
  });
});
