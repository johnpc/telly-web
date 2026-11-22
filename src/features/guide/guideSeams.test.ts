import { describe, expect, it, vi } from 'vitest';
import { MyListRepository } from '@/core/db/myListRepository';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { freshDb } from '@/test/dbFixtures';
import { createGuideSeams, myListKey, reminderKey } from './guideSeams';
import { ORIGIN, channel, program } from './testFixtures';

describe('guideSeams', () => {
  it('toggles My list entries and reminders through the repositories', async () => {
    const db = freshDb();
    const myList = new MyListRepository(db);
    const reminders = new ReminderRepository(db);
    const openUrl = vi.fn();
    const seams = createGuideSeams({ myList, reminders, now: () => 5, openUrl });
    const c = channel(1);
    const p = program('c1', ORIGIN, ORIGIN + 1, 'Show');
    await seams.toggleMyList(c, p);
    expect(await myList.all()).toMatchObject([
      { channelKey: 'c1', startMs: ORIGIN, title: 'Show', addedAtMs: 5 },
    ]);
    await seams.toggleMyList(c, p);
    expect(await myList.all()).toEqual([]);
    await seams.toggleReminder(c, p);
    expect(await reminders.upcoming()).toMatchObject([{ channelId: 1, title: 'Show', startMs: ORIGIN }]);
    await seams.toggleReminder(c, p);
    expect(await reminders.upcoming()).toEqual([]);
    seams.openExternal(c);
    expect(openUrl).toHaveBeenCalledWith('http://x/1.ts');
    expect(myListKey('k', 1)).toBe('k|1');
    expect(reminderKey(1, 2, 't')).toBe('1|2|t');
  });
  it('defaults to the app repositories and window.open', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    createGuideSeams().openExternal(channel(1));
    expect(open).toHaveBeenCalledWith('http://x/1.ts', '_blank', 'noopener');
    open.mockRestore();
  });
});
