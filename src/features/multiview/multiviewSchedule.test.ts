import { describe, expect, it } from 'vitest';
import { program, UTC } from '@/features/playback/fixtures.test';
import { FUTURE_MS, PAST_MS, buildSchedule } from './multiviewSchedule';

describe('buildSchedule', () => {
  it('sorts chronologically, formats the start time and marks the airing row', () => {
    const hour = 3_600_000;
    const rows = buildSchedule(
      [program('c1', 2 * hour, 3 * hour, 'Later'), program('c1', hour, 2 * hour, 'Now')],
      hour + 1,
      UTC,
    );
    expect(rows.map((r) => r.title)).toEqual(['Now', 'Later']);
    expect(rows[0]).toMatchObject({ key: hour, timeText: '01:00 AM', airing: true });
    expect(rows[1]?.airing).toBe(false);
    expect(PAST_MS).toBe(6 * hour);
    expect(FUTURE_MS).toBe(18 * hour);
  });
});
