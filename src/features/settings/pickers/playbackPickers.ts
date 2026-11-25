import { TellySettings } from '@/core/settings/tellySettings';
import { bufferSizeOptions } from '../bufferSizeCopy';
import {
  AFR_OPTIONS,
  EXTERNAL_PLAYER_OPTIONS,
  GUIDE_CHANNEL_KEYS_ACTIONS,
  GUIDE_LEFT_RIGHT_ACTIONS,
  GUIDE_LONG_OK_ACTIONS,
  PLAYER_LEFT_RIGHT_ACTIONS,
  PLAYER_LONG_OK_ACTIONS,
  PLAYER_OK_ACTIONS,
  PLAYER_UP_DOWN_ACTIONS,
  RESIZE_MODE_OPTIONS,
  SKIP_STEP_PRESETS,
} from '../keymapOptions';
import { RowIds } from '../rowIds';
import { pickerOf, sameRaw, type PickerSpec } from './pickerSpec';

/** The Playback pickers (port of Android `SettingsPickers` + `SettingsPickersPlayback.kt`). */
export const playbackPickerSpecs: readonly PickerSpec[] = [
  pickerOf(RowIds.PLAYBACK_BUFFER_SIZE, 'Buffer size', TellySettings.BUFFER_SIZE, bufferSizeOptions()),
  pickerOf(
    RowIds.PLAYBACK_AUDIO_DECODER,
    'Audio decoder',
    TellySettings.AUDIO_DECODER,
    sameRaw(['Hardware', 'Software']),
  ),
  pickerOf(
    RowIds.PLAYBACK_VIDEO_DECODER,
    'Video decoder',
    TellySettings.VIDEO_DECODER,
    sameRaw(['Hardware', 'Software']),
  ),
  pickerOf(RowIds.PLAYBACK_AFR, 'Auto frame rate (AFR)', TellySettings.AUTO_FRAME_RATE, sameRaw(AFR_OPTIONS)),
  pickerOf(
    RowIds.PLAYBACK_EXTERNAL_PLAYER,
    'Use external player',
    TellySettings.USE_EXTERNAL_PLAYER,
    sameRaw(EXTERNAL_PLAYER_OPTIONS),
  ),
  pickerOf(
    RowIds.PLAYBACK_RESIZE_MODE,
    'Resize mode',
    TellySettings.RESIZE_MODE,
    sameRaw(RESIZE_MODE_OPTIONS),
  ),
  pickerOf(RowIds.PLAYBACK_SKIP_STEPS, 'Skip steps', TellySettings.SKIP_STEPS, sameRaw(SKIP_STEP_PRESETS)),
];

/**
 * Remote control key-remap pickers (the TV guide + Player sub-panes; port
 * of Android `RemoteKeymapPickers.kt`). Options are the keymap labels,
 * persisted raw, so the pickers and the key policies can never drift.
 */
export const remoteKeymapPickerSpecs: readonly PickerSpec[] = [
  pickerOf(
    RowIds.REMOTE_GUIDE_LEFT_RIGHT,
    'Left/Right buttons',
    TellySettings.REMOTE_GUIDE_LEFT_RIGHT,
    sameRaw(GUIDE_LEFT_RIGHT_ACTIONS),
  ),
  pickerOf(
    RowIds.REMOTE_GUIDE_CHANNEL_UP_DOWN,
    'Channel up/down buttons',
    TellySettings.REMOTE_GUIDE_CHANNEL_UP_DOWN,
    sameRaw(GUIDE_CHANNEL_KEYS_ACTIONS),
  ),
  pickerOf(
    RowIds.REMOTE_GUIDE_LONG_OK,
    'Long press OK',
    TellySettings.REMOTE_GUIDE_LONG_OK,
    sameRaw(GUIDE_LONG_OK_ACTIONS),
  ),
  pickerOf(RowIds.REMOTE_PLAYER_OK, 'OK button', TellySettings.REMOTE_PLAYER_OK, sameRaw(PLAYER_OK_ACTIONS)),
  pickerOf(
    RowIds.REMOTE_PLAYER_UP_DOWN,
    'Up/Down buttons',
    TellySettings.REMOTE_PLAYER_UP_DOWN,
    sameRaw(PLAYER_UP_DOWN_ACTIONS),
  ),
  pickerOf(
    RowIds.REMOTE_PLAYER_LEFT_RIGHT,
    'Left/Right buttons',
    TellySettings.REMOTE_PLAYER_LEFT_RIGHT,
    sameRaw(PLAYER_LEFT_RIGHT_ACTIONS),
  ),
  pickerOf(
    RowIds.REMOTE_PLAYER_LONG_OK,
    'Long press OK',
    TellySettings.REMOTE_PLAYER_LONG_OK,
    sameRaw(PLAYER_LONG_OK_ACTIONS),
  ),
];
