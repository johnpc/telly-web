import { useLiveQuery } from 'dexie-react-hooks';
import { type MyListRepository, myListRepository } from '@/core/db/myListRepository';
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import { myListKey, reminderKey } from './guideSeams';

const NONE: ReadonlySet<string> = new Set<string>();

/** Saved-programme keys driving the flipped "Add to My list" labels (Android `MyListMenu.keys`). */
export function useMyListKeys(repository: MyListRepository = myListRepository): ReadonlySet<string> {
  return (
    useLiveQuery(
      async () => new Set((await repository.all()).map((row) => myListKey(row.channelKey, row.startMs))),
      [repository],
    ) ?? NONE
  );
}

/** Pending-reminder keys driving the dropdown's live Remind label (Android `GuideReminders.keys`). */
export function useReminderKeys(repository: ReminderRepository = reminderRepository): ReadonlySet<string> {
  return (
    useLiveQuery(
      async () =>
        new Set(
          (await repository.upcoming()).map((row) => reminderKey(row.channelId, row.startMs, row.title)),
        ),
      [repository],
    ) ?? NONE
  );
}
