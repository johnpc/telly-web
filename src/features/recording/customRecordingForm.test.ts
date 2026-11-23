import { describe, expect, it, vi } from 'vitest';
import {
  CustomRecordingForm,
  DEFAULT_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
} from './customRecordingForm';
import { fakeChannel } from './recordingTestSupport';

const MINUTE = 60_000;

describe('CustomRecordingForm', () => {
  it('defaults the start to the next 5-minute boundary at least a minute out and the duration to an hour', () => {
    // 12:03:30 -> floor at 12:05 (12:04:30 rounded up to the boundary).
    const now = Date.UTC(2026, 8, 15, 12, 3, 30);
    const form = new CustomRecordingForm(fakeChannel(), now);
    expect(form.startMs).toBe(Date.UTC(2026, 8, 15, 12, 5));
    expect(form.durationMinutes).toBe(DEFAULT_DURATION_MINUTES);
    expect(form.endMs).toBe(form.startMs + 60 * MINUTE);
    // 12:04:30 -> 12:05 would be only 30 s away: skip to 12:10.
    expect(new CustomRecordingForm(fakeChannel(), Date.UTC(2026, 8, 15, 12, 4, 30)).startMs).toBe(
      Date.UTC(2026, 8, 15, 12, 10),
    );
  });

  it('steps the start by 5 minutes, never before the opening boundary, and notifies', () => {
    const form = new CustomRecordingForm(fakeChannel(), Date.UTC(2026, 8, 15, 12, 0));
    const listener = vi.fn();
    form.subscribe(listener);
    const floor = form.startMs;
    form.adjustStart(+2);
    expect(form.startMs).toBe(floor + 10 * MINUTE);
    form.adjustStart(-5);
    expect(form.startMs).toBe(floor);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('steps the duration by 15 minutes within 15 min .. 6 h', () => {
    const form = new CustomRecordingForm(fakeChannel(), 0);
    form.adjustDuration(+1);
    expect(form.durationMinutes).toBe(75);
    form.adjustDuration(-100);
    expect(form.durationMinutes).toBe(MIN_DURATION_MINUTES);
    form.adjustDuration(+100);
    expect(form.durationMinutes).toBe(MAX_DURATION_MINUTES);
    expect(form.endMs - form.startMs).toBe(MAX_DURATION_MINUTES * MINUTE);
  });
});
