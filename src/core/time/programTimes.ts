import { type ClockStyle, CLOCK_12H } from './clockStyle';
import { dayOf, hhmm12, hhmm24, hour12, meridiem, pad2, partsOf } from './timeParts';

/**
 * TiviMate-style time strings (Android `ProgramTimes`): programme ranges
 * "02:30 — 03:45 PM" (start meridiem only when it differs), the clock stamp
 * "Sun, Sep 13, 2:45 PM", a bare start "12:45 AM"; the 24-hour choice renders
 * "14:30 — 15:45" / "Sun, Sep 13, 14:45". ONE implementation for every slice.
 */
const MINUTE_MS = 60_000;
const SECOND_MS = 1_000;
export const PERMILLE = 1000;

/** "02:30 — 03:45 PM" / "11:30 AM — 12:15 PM" / "14:30 — 15:45". */
export function rangeText(startMs: number, endMs: number, style: ClockStyle): string {
  const start = partsOf(startMs, style.timeZone);
  const end = partsOf(endMs, style.timeZone);
  if (style.is24h) return `${hhmm24(start)} — ${hhmm24(end)}`;
  const prefix = meridiem(start) === meridiem(end) ? hhmm12(start) : `${hhmm12(start)} ${meridiem(start)}`;
  return `${prefix} — ${hhmm12(end)} ${meridiem(end)}`;
}

/** "Sun, Sep 13". */
export function dayText(atMs: number, style: ClockStyle = CLOCK_12H): string {
  return dayOf(partsOf(atMs, style.timeZone));
}

/** "Sun, Sep 13, 2:45 PM" / "Sun, Sep 13, 14:45". */
export function clockText(atMs: number, style: ClockStyle = CLOCK_12H): string {
  const p = partsOf(atMs, style.timeZone);
  const time = style.is24h ? hhmm24(p) : `${hour12(p)}:${pad2(p.minute)} ${meridiem(p)}`;
  return `${dayOf(p)}, ${time}`;
}

/** Bare stamp "12:45 AM" / "00:45" (zero-padded hour). */
export function startTimeText(atMs: number, style: ClockStyle = CLOCK_12H): string {
  const p = partsOf(atMs, style.timeZone);
  return style.is24h ? hhmm24(p) : `${hhmm12(p)} ${meridiem(p)}`;
}

export function sameLocalDay(aMs: number, bMs: number, style: ClockStyle = CLOCK_12H): boolean {
  const a = partsOf(aMs, style.timeZone);
  const b = partsOf(bMs, style.timeZone);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Search air time: bare range today, "Mon, Sep 14, 12:45 — 01:45 AM" on other days. */
export function airTimeText(startMs: number, endMs: number, atMs: number, style: ClockStyle): string {
  const range = rangeText(startMs, endMs, style);
  return sameLocalDay(startMs, atMs, style) ? range : `${dayText(startMs, style)}, ${range}`;
}

/** Transport-row span "00:16" / "45:00" / "1:15:00". */
export function spanText(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / SECOND_MS);
  const minSec = `${pad2(Math.floor(total / 60) % 60)}:${pad2(total % 60)}`;
  const hours = Math.floor(total / 3600);
  return hours > 0 ? `${hours}:${minSec}` : minSec;
}

/** Minutes left in the programme, rounded up ("61 min"). */
export function remainingMinutes(endMs: number, atMs: number): number {
  return Math.floor((Math.max(0, endMs - atMs) + MINUTE_MS - 1) / MINUTE_MS);
}

export function progressPermille(startMs: number, endMs: number, atMs: number): number {
  if (endMs <= startMs) return 0;
  const fraction = (atMs - startMs) / (endMs - startMs);
  return Math.min(PERMILLE, Math.max(0, Math.trunc(fraction * PERMILLE)));
}

/** Object form used by the playback slice. */
export const ProgramTimes = {
  range: rangeText,
  clock: clockText,
  startTime: startTimeText,
  span: spanText,
  remainingMinutes,
  progressPermille,
};
