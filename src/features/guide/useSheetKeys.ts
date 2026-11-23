import { useLiveQuery } from 'dexie-react-hooks';
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import { reminderKey } from './guideSeams';

const NONE: ReadonlySet<string> = new Set<string>();

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
