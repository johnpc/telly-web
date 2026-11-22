// Feeds Settings -> Other -> Reminders (port of Android `ReminderSettingsFeed`):
// the scheduled reminders joined with their channel names and a TiviMate-style
// air-time stamp, in air order, plus the pane's OK -> delete confirm action.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import { type ChannelRow, type ReminderRow, displayName } from '@/core/db/types';
import { clockText } from '@/features/search/programTimes';

/** One scheduled reminder as the settings pane lists it. */
export interface ReminderListItem {
  id: number;
  title: string;
  channelName: string;
  /** "Sun, Sep 13, 2:45 PM". */
  airTime: string;
  startMs: number;
}

export const NO_REMINDERS = 'No reminders';

export function reminderItems(
  reminders: readonly ReminderRow[],
  channels: readonly ChannelRow[],
): ReminderListItem[] {
  return reminders.map((reminder) => {
    const channel = channels.find((row) => row.id === reminder.channelId);
    return {
      id: reminder.id,
      title: reminder.title,
      channelName: channel === undefined ? '' : displayName(channel),
      airTime: clockText(reminder.startMs),
      startMs: reminder.startMs,
    };
  });
}

export interface RemindersModel {
  /** undefined until the first read resolves. */
  items: ReminderListItem[] | undefined;
  /** The pane's "Delete reminder?" confirm lands here. */
  remove(id: number): Promise<void>;
}

export function useReminders(
  reminders: ReminderRepository = reminderRepository,
  channels: ChannelRepository = channelRepository,
): RemindersModel {
  const items = useLiveQuery(
    async () => reminderItems(await reminders.upcoming(), await channels.visible()),
    [reminders, channels],
  );
  const remove = useCallback((id: number) => reminders.remove(id), [reminders]);
  return { items, remove };
}
