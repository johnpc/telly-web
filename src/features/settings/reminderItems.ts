import { type ChannelRow, displayName, type ReminderRow } from '@/core/db/types';
import { clockText } from '@/core/time/programTimes';
import type { ReminderListItem } from './settingsFeeds';

/** Scheduled reminders joined with their channel names + a clock stamp, in air order. */
export function toReminderItems(
  reminders: readonly ReminderRow[],
  channels: readonly ChannelRow[],
  twelveHour: boolean,
  timeZone?: string,
): ReminderListItem[] {
  return reminders.map((reminder) => {
    const channel = channels.find((row) => row.id === reminder.channelId);
    return {
      id: reminder.id,
      title: reminder.title,
      channelName: channel === undefined ? '' : displayName(channel),
      // Android `ProgramTimes.clock`: "Sun, Sep 13, 2:45 PM" / "Sun, Sep 13, 14:45".
      airTime:
        timeZone === undefined
          ? clockText(reminder.startMs, { is24h: !twelveHour })
          : clockText(reminder.startMs, { is24h: !twelveHour, timeZone }),
    };
  });
}
