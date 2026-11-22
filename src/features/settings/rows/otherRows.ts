import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { RowIds } from '../rowIds';
import type { RecordingStorageInfo, ReminderListItem } from '../settingsFeeds';
import { action, header, note, type SettingsRow, toggle, value } from '../settingsRow';

/** Other pane rows (catalogue 68): Search, Reminders, Recording and VOD are all live. */
export function otherRows(): SettingsRow[] {
  return [
    value(RowIds.OTHER_SEARCH, 'Search'),
    value(RowIds.OTHER_REMINDERS, 'Reminders'),
    value(RowIds.OTHER_RECORDING, 'Recording'),
    value(RowIds.OTHER_VOD, 'VOD'),
  ];
}

/** About pane rows (catalogue 53). The statistics toggle is an honest no-op: telly has no backend. */
export function aboutRows(s: SettingsRepository, versionName: string): SettingsRow[] {
  return [
    toggle(
      RowIds.ABOUT_STATISTICS,
      'Send anonymous statistics to improve the app',
      s.get(TellySettings.SEND_STATISTICS),
    ),
    action(RowIds.ABOUT_PRIVACY_POLICY, 'Privacy policy'),
    value(RowIds.ABOUT_VERSION, 'Version', versionName),
  ];
}

/** Other -> Search: the save-history toggle + the confirmed clear action. */
export function otherSearchRows(s: SettingsRepository): SettingsRow[] {
  return [
    toggle(RowIds.SEARCH_SAVE_HISTORY, 'Save search history', s.get(TellySettings.SEARCH_SAVE_HISTORY)),
    action(RowIds.SEARCH_CLEAR_HISTORY, 'Clear search history'),
  ];
}

/** Other -> Reminders: lead-time picker + the scheduled reminders (or "No reminders"). */
export function remindersRows(s: SettingsRepository, reminders: readonly ReminderListItem[]): SettingsRow[] {
  const lead = value(
    RowIds.REMINDERS_LEAD,
    'Show reminder before, min',
    String(s.get(TellySettings.REMINDER_LEAD_MINUTES)),
  );
  if (reminders.length === 0) return [lead, note('No reminders', false)];
  return [
    lead,
    header('Scheduled reminders'),
    ...reminders.map((item) =>
      value(RowIds.REMINDER_PREFIX + item.id, item.title, `${item.channelName} • ${item.airTime}`),
    ),
  ];
}

/** Other -> VOD: the resume toggle plus the clear-positions action behind a confirm. */
export function vodRows(s: SettingsRepository): SettingsRow[] {
  return [
    toggle(
      RowIds.VOD_REMEMBER_POSITION,
      'Remember playback position',
      s.get(TellySettings.VOD_REMEMBER_POSITION),
    ),
    action(RowIds.VOD_CLEAR_POSITIONS, 'Clear playback positions'),
  ];
}

/** The honest note: telly schedules in-app, not via system alarms. */
export const RECORDING_SCHEDULING_NOTE = 'Scheduled recordings start only while telly is running';

/** Human-readable byte count ("0 B", "1.5 MB", "2.0 GB"). */
export function sizeText(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const safe = Math.max(0, bytes);
  const unit = safe < 1024 ? 0 : Math.min(units.length - 1, Math.floor(Math.log(safe) / Math.log(1024)));
  const size = safe / 1024 ** unit;
  return `${unit === 0 ? String(size) : size.toFixed(1)} ${units[unit]}`;
}

/** Other -> Recording: storage used, free space, delete-all (confirm) and the scheduling note. */
export function recordingRows(storage: RecordingStorageInfo): SettingsRow[] {
  return [
    value(RowIds.RECORDING_STORAGE_USED, 'Storage used by recordings', sizeText(storage.usedBytes)),
    value(RowIds.RECORDING_FREE_SPACE, 'Free space', sizeText(storage.freeBytes)),
    action(RowIds.RECORDING_DELETE_ALL, 'Delete all recordings'),
    note(RECORDING_SCHEDULING_NOTE),
  ];
}
