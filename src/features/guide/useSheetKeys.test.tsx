import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyListRepository } from '@/core/db/myListRepository';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { freshDb } from '@/test/dbFixtures';
import { useMyListKeys, useReminderKeys } from './useSheetKeys';

describe('useSheetKeys', () => {
  it('derives the live My-list and reminder key sets', async () => {
    const db = freshDb();
    const myList = new MyListRepository(db);
    const reminders = new ReminderRepository(db);
    await myList.upsert({
      channelKey: 'k',
      startMs: 1,
      endMs: 2,
      title: 't',
      description: null,
      addedAtMs: 0,
    });
    await reminders.upsert({ channelId: 3, title: 'r', startMs: 4, stopMs: 5 });
    const list = renderHook(() => useMyListKeys(myList));
    const rem = renderHook(() => useReminderKeys(reminders));
    await vi.waitFor(() => expect(list.result.current.has('k|1')).toBe(true));
    await vi.waitFor(() => expect(rem.result.current.has('3|4|r')).toBe(true));
  });
});
