import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { freshDb } from '@/test/dbFixtures';
import { useReminderKeys } from './useSheetKeys';

describe('useSheetKeys', () => {
  it('derives the live reminder key set', async () => {
    const db = freshDb();
    const reminders = new ReminderRepository(db);
    await reminders.upsert({ channelId: 3, title: 'r', startMs: 4, stopMs: 5 });
    const rem = renderHook(() => useReminderKeys(reminders));
    await vi.waitFor(() => expect(rem.result.current.has('3|4|r')).toBe(true));
  });
});
