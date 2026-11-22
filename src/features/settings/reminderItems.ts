import { type ChannelRow, displayName, type ReminderRow } from '@/core/db/types';
import type { ReminderListItem } from './settingsFeeds';

/** "03:45 PM" / "15:45" per the clock-format setting (Android `ProgramTimes.clock`). */
export function formatClock(ms: number, twelveHour: boolean, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: twelveHour };
  if (timeZone !== undefined) options.timeZone = timeZone;
  return new Intl.DateTimeFormat('en-US', options).format(new Date(ms));
}

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
      airTime: formatClock(reminder.startMs, twelveHour, timeZone),
    };
  });
}
