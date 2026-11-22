import { describe, expect, it } from 'vitest';
import { clockStyleOf, is24Raw } from './clockStyle';
import { ProgramTimes } from './programTimes';

const UTC = { is24h: false, timeZone: 'UTC' };
const UTC24 = { is24h: true, timeZone: 'UTC' };
const T = Date.UTC(2026, 8, 13, 14, 30); // Sun, Sep 13 2026 14:30 UTC

describe('ProgramTimes', () => {
  it('formats ranges with the start meridiem only when it differs', () => {
    expect(ProgramTimes.range(T, T + 75 * 60_000, UTC)).toBe('02:30 — 03:45 PM');
    expect(ProgramTimes.range(T - 3 * 3_600_000, T, UTC)).toBe('11:30 AM — 02:30 PM');
    expect(ProgramTimes.range(T, T + 75 * 60_000, UTC24)).toBe('14:30 — 15:45');
    expect(ProgramTimes.range(Date.UTC(2026, 0, 1, 0, 5), Date.UTC(2026, 0, 1, 12, 5), UTC)).toBe(
      '12:05 AM — 12:05 PM',
    );
  });

  it('formats the overlay clock and bare start times', () => {
    expect(ProgramTimes.clock(T + 15 * 60_000, UTC)).toBe('Sun, Sep 13, 2:45 PM');
    expect(ProgramTimes.clock(T + 15 * 60_000, UTC24)).toBe('Sun, Sep 13, 14:45');
    expect(ProgramTimes.startTime(Date.UTC(2026, 0, 1, 0, 45), UTC)).toBe('12:45 AM');
    expect(ProgramTimes.startTime(Date.UTC(2026, 0, 1, 0, 45), UTC24)).toBe('00:45');
    expect(ProgramTimes.clock(T, { is24h: false })).toMatch(/^\w{3}, \w{3} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
  });

  it('spans, remaining minutes and progress', () => {
    expect(ProgramTimes.span(16_000)).toBe('00:16');
    expect(ProgramTimes.span(45 * 60_000)).toBe('45:00');
    expect(ProgramTimes.span(75 * 60_000)).toBe('1:15:00');
    expect(ProgramTimes.span(-5)).toBe('00:00');
    expect(ProgramTimes.remainingMinutes(T + 61 * 60_000 - 1, T)).toBe(61);
    expect(ProgramTimes.remainingMinutes(T, T + 1)).toBe(0);
    expect(ProgramTimes.progressPermille(0, 1000, 250)).toBe(250);
    expect(ProgramTimes.progressPermille(0, 1000, 5000)).toBe(1000);
    expect(ProgramTimes.progressPermille(0, 1000, -5)).toBe(0);
    expect(ProgramTimes.progressPermille(10, 10, 10)).toBe(0);
  });

  it('clockStyleOf reads the 24-hour raw', () => {
    expect(is24Raw(' 24-hour')).toBe(true);
    expect(clockStyleOf('12-hour')).toEqual({ is24h: false });
    expect(clockStyleOf('24-hour', 'UTC')).toEqual({ is24h: true, timeZone: 'UTC' });
  });
});
