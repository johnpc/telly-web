import { describe, expect, it } from 'vitest';
import {
  CLOCK_12H,
  CLOCK_24H,
  clock,
  is24Raw,
  progressPermille,
  range,
  remainingMinutes,
  timeLabel,
} from './guideTimes';

const at = (h: number, m: number): number => new Date(2026, 8, 13, h, m, 0).getTime();

describe('guideTimes', () => {
  it('renders TiviMate time labels in both clock formats', () => {
    expect(timeLabel(at(14, 30), CLOCK_12H)).toBe('02:30 PM');
    expect(timeLabel(at(0, 0), CLOCK_12H)).toBe('12:00 AM');
    expect(timeLabel(at(14, 30), CLOCK_24H)).toBe('14:30');
  });
  it('renders ranges with the start meridiem only when it differs', () => {
    expect(range(at(14, 30), at(15, 45), CLOCK_12H)).toBe('02:30 — 03:45 PM');
    expect(range(at(23, 30), at(24, 45), CLOCK_12H)).toBe('11:30 PM — 12:45 AM');
    expect(range(at(14, 30), at(15, 45), CLOCK_24H)).toBe('14:30 — 15:45');
  });
  it('renders the header clock', () => {
    expect(clock(at(14, 45), CLOCK_12H)).toBe('Sun, Sep 13, 2:45 PM');
    expect(clock(at(14, 45), CLOCK_24H)).toBe('Sun, Sep 13, 14:45');
    expect(is24Raw('24-hour')).toBe(true);
    expect(is24Raw('12-hour')).toBe(false);
  });
  it('computes remaining minutes (rounded up) and progress permille', () => {
    expect(remainingMinutes(at(15, 0), at(14, 0) + 1)).toBe(60);
    expect(remainingMinutes(at(15, 0), at(16, 0))).toBe(0);
    expect(progressPermille(at(14, 0), at(15, 0), at(14, 30))).toBe(500);
    expect(progressPermille(at(14, 0), at(14, 0), at(14, 30))).toBe(0);
    expect(progressPermille(at(14, 0), at(15, 0), at(16, 0))).toBe(1000);
  });
});
