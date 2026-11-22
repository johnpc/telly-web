import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { freshDb } from '@/test/dbFixtures';
import {
  REMIND_LABEL,
  UNREMIND_LABEL,
  addReminder,
  reminderKeyOf,
  reminderKeysOf,
  reminderLabel,
  toggleReminder,
  useReminderKeys,
} from './guideReminders';

const program = { startMs: 1000, endMs: 2000, title: 'Newsroom Live' };

describe('guideReminders', () => {
  it('labels the Remind row from the pending key set', () => {
    const keys = new Set([reminderKeyOf(1, 1000, 'Newsroom Live')]);
    expect(reminderLabel(keys, 1, program)).toBe(UNREMIND_LABEL);
    expect(reminderLabel(keys, 2, program)).toBe(REMIND_LABEL);
    expect(reminderLabel(keys, null, program)).toBe(REMIND_LABEL);
    expect(reminderLabel(keys, 1, null)).toBe(REMIND_LABEL);
  });

  it('toggles a reminder on the store and exposes the live keys', async () => {
    const repository = new ReminderRepository(freshDb());
    const { result } = renderHook(() => useReminderKeys(repository));
    expect(result.current.size).toBe(0);
    expect(await toggleReminder({ id: 1 }, program, repository)).toBe(true);
    await waitFor(() => expect(result.current.has('1|1000|Newsroom Live')).toBe(true));
    expect(reminderKeysOf(await repository.upcoming())).toEqual(new Set(['1|1000|Newsroom Live']));
    expect(await toggleReminder({ id: 1 }, program, repository)).toBe(false);
    expect(await repository.upcoming()).toEqual([]);
    const id = await addReminder({ id: 1 }, program, repository);
    expect((await repository.upcoming()).map((row) => row.id)).toEqual([id]);
  });
});
