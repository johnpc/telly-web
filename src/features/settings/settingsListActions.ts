import { RowIds, suffixOf } from './rowIds';
import type { SettingsController } from './settingsController';

// Blocked-channels pane + Other -> Reminders list rows: OK on a listed
// channel unblocks it; OK on a reminder asks before deleting it.

/** OK on a blocked-channel row unblocks it (pane entry already PIN-gated). */
export async function unblockChannel(c: SettingsController, rowId: string): Promise<void> {
  const channelId = Number(suffixOf(rowId, RowIds.BLOCKED_CHANNEL_PREFIX));
  const channel = c.feeds.blockedChannels.find((row) => row.id === channelId);
  if (channel !== undefined) await c.deps.channels.updateFlags(channel.id, { blocked: false });
}

/** OK on a scheduled reminder: the "Delete reminder?" confirm. */
export function confirmDeleteReminderOverlay(c: SettingsController, rowId: string): void {
  const reminderId = Number(suffixOf(rowId, RowIds.REMINDER_PREFIX));
  const item = c.feeds.reminders.find((row) => row.id === reminderId);
  if (item !== undefined) c.showOverlay({ kind: 'ConfirmDeleteReminder', reminderId, title: item.title });
}

/** OK on Delete in the reminder confirm. */
export async function confirmDeleteReminder(c: SettingsController): Promise<void> {
  const confirm = c.state.overlay;
  if (confirm?.kind !== 'ConfirmDeleteReminder') return;
  c.dismissOverlay();
  await c.deps.reminders.remove(confirm.reminderId);
}

/** OK on Clear in the search-history confirm empties the history store. */
export function confirmClearHistory(c: SettingsController): void {
  if (c.state.overlay?.kind !== 'ConfirmClearHistory') return;
  c.deps.clearSearchHistory();
  c.dismissOverlay();
}

/** OK on Clear in the VOD confirm: empty vod_positions, close the dialog. */
export async function confirmClearVodPositions(c: SettingsController): Promise<void> {
  if (c.state.overlay?.kind !== 'ConfirmClearVodPositions') return;
  c.dismissOverlay();
  await c.deps.vod.clearPositions();
}

/** OK on Delete in the "Delete all recordings?" confirm. */
export async function confirmDeleteRecordings(c: SettingsController): Promise<void> {
  if (c.state.overlay?.kind !== 'ConfirmDeleteRecordings') return;
  c.dismissOverlay();
  await c.deps.recordings.removeAll();
}
