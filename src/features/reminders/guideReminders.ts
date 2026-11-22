// The guide-facing reminders seam (port of Android `GuideReminders` +
// `ReminderStore.toggle`): the cell dropdown's Remind row toggles a reminder
// for the focused future programme and relabels to "Remove reminder" while
// one is set. The search dropdown drives the SAME store, so the two menus
// can never drift.
import { useLiveQuery } from 'dexie-react-hooks';
import { type ReminderRepository, reminderRepository } from '@/core/db/reminderRepository';
import type { ChannelRow, ProgramRow, ReminderRow } from '@/core/db/types';

export const REMIND_LABEL = 'Remind';
export const UNREMIND_LABEL = 'Remove reminder';

/** Identity of a reminder as the dropdowns see it. */
export function reminderKeyOf(channelId: number, startMs: number, title: string): string {
  return `${channelId}|${startMs}|${title}`;
}

export function reminderKeysOf(rows: readonly ReminderRow[]): ReadonlySet<string> {
  return new Set(rows.map((row) => reminderKeyOf(row.channelId, row.startMs, row.title)));
}

/** The dropdown row label for the cell's programme under `keys`. */
export function reminderLabel(
  keys: ReadonlySet<string>,
  channelId: number | null,
  program: Pick<ProgramRow, 'startMs' | 'title'> | null,
): string {
  if (channelId === null || program === null) return REMIND_LABEL;
  return keys.has(reminderKeyOf(channelId, program.startMs, program.title)) ? UNREMIND_LABEL : REMIND_LABEL;
}

/** Creates a reminder for `program` on the channel; resolves to the row id. */
export function addReminder(
  channel: Pick<ChannelRow, 'id'>,
  program: Pick<ProgramRow, 'startMs' | 'endMs' | 'title'>,
  repository: ReminderRepository = reminderRepository,
): Promise<number> {
  return repository.upsert({
    channelId: channel.id,
    title: program.title,
    startMs: program.startMs,
    stopMs: program.endMs,
  });
}

/** Creates the reminder, or removes the one already set for it; resolves to the new set state. */
export async function toggleReminder(
  channel: Pick<ChannelRow, 'id'>,
  program: Pick<ProgramRow, 'startMs' | 'endMs' | 'title'>,
  repository: ReminderRepository = reminderRepository,
): Promise<boolean> {
  const existing = await repository.find(channel.id, program.startMs, program.title);
  if (existing === null) {
    await addReminder(channel, program, repository);
    return true;
  }
  await repository.remove(existing.id);
  return false;
}

/** Keys of every pending reminder, live; drives the dropdown labels. */
export function useReminderKeys(repository: ReminderRepository = reminderRepository): ReadonlySet<string> {
  return useLiveQuery(async () => reminderKeysOf(await repository.upcoming()), [repository]) ?? EMPTY_KEYS;
}

const EMPTY_KEYS: ReadonlySet<string> = new Set();
