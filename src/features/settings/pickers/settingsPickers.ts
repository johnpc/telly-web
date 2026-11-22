import { TellySettings } from '@/core/settings/tellySettings';
import {
  PLAYLIST_UPDATE_INTERVAL_HOURS,
  playlistUpdateIntervalSetting,
} from '@/features/playlist/playlistSettings';
import { RowIds } from '../rowIds';
import { appearancePickerSpecs } from './appearancePickers';
import { intervalLabel, numbered, pickerOf, sameRaw, type PickerSpec } from './pickerSpec';
import { playbackPickerSpecs, remoteKeymapPickerSpecs } from './playbackPickers';

export const EPG_INTERVAL_HOURS: readonly number[] = [0, 1, 2, 3, 6, 12, 24];
export const EPG_PAST_DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];
export const REMINDER_LEAD_MINUTES: readonly number[] = [1, 5, 10, 15, 30];

/** Row id -> picker, the whole captured tree (port of Android `SettingsPickers.kt`). */
const all: readonly PickerSpec[] = [
  pickerOf(
    RowIds.PLAYLISTS_SORTING,
    'Playlists sorting',
    TellySettings.PLAYLISTS_SORTING,
    sameRaw(['By name', 'By date added']),
  ),
  pickerOf(
    RowIds.EPG_UPDATE_INTERVAL,
    'Update interval, hours',
    TellySettings.EPG_UPDATE_INTERVAL_HOURS,
    numbered(EPG_INTERVAL_HOURS, intervalLabel),
  ),
  pickerOf(
    RowIds.EPG_PAST_DAYS,
    'Past days to keep EPG',
    TellySettings.EPG_PAST_DAYS_TO_KEEP,
    numbered(EPG_PAST_DAYS),
  ),
  pickerOf(
    RowIds.REMINDERS_LEAD,
    'Show reminder before, min',
    TellySettings.REMINDER_LEAD_MINUTES,
    numbered(REMINDER_LEAD_MINUTES),
  ),
  pickerOf(
    RowIds.PARENTAL_PIN_INPUT,
    'PIN input method',
    TellySettings.PARENTAL_PIN_INPUT_METHOD,
    sameRaw(['Picker', 'Keyboard']),
  ),
  pickerOf(
    RowIds.PARENTAL_RELOCK,
    "Don't require PIN after unlocking",
    TellySettings.PARENTAL_RELOCK,
    sameRaw(['Always require', 'Until app restart']),
  ),
  ...appearancePickerSpecs,
  ...playbackPickerSpecs,
  ...remoteKeymapPickerSpecs,
];

export const pickersByRowId: ReadonlyMap<string, PickerSpec> = new Map(all.map((spec) => [spec.rowId, spec]));

/** The per-playlist "Update interval, hours" picker (keyed by the playlist URL). */
export function playlistUpdateIntervalPicker(url: string): PickerSpec {
  return pickerOf(
    RowIds.PLAYLIST_UPDATE_INTERVAL,
    'Update interval, hours',
    playlistUpdateIntervalSetting(url),
    numbered(PLAYLIST_UPDATE_INTERVAL_HOURS, intervalLabel),
  );
}
