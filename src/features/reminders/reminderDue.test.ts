import { describe, expect, it } from 'vitest';
import { MINUTE_MS, reminderStateOf } from './reminderDue';

describe('reminderStateOf', () => {
  const reminder = { startMs: 100 * MINUTE_MS, stopMs: 160 * MINUTE_MS };
  const lead = 5 * MINUTE_MS;

  it('is PENDING before start minus lead, DUE from then, EXPIRED once the programme ended', () => {
    expect(reminderStateOf(reminder, 94 * MINUTE_MS, lead)).toBe('PENDING');
    expect(reminderStateOf(reminder, 95 * MINUTE_MS, lead)).toBe('DUE');
    expect(reminderStateOf(reminder, 159 * MINUTE_MS, lead)).toBe('DUE');
    expect(reminderStateOf(reminder, 160 * MINUTE_MS, lead)).toBe('EXPIRED');
  });
});
