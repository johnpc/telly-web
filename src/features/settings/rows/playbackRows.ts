import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { RowIds } from '../rowIds';
import { header, type SettingsRow, toggle, value } from '../settingsRow';

export const BROWSER_DECIDES = 'Kept for backups; the browser picks its own decoder';

/**
 * Playback pane rows (catalogue 60–62; port of Android `SettingsRowsPlayback.kt`).
 * Buffer size, the decoder picks, AFR, external player and Skip steps are
 * live pickers. Web honesties: decoders persist but the browser decides;
 * AFR is a display-mode switch the web cannot perform, so it stays a live
 * picker (its pick persists) with the caveat in its summary.
 */
export function playbackRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.PLAYBACK_BUFFER_SIZE, 'Buffer size', s.get(TellySettings.BUFFER_SIZE)),
    value(
      RowIds.PLAYBACK_AUDIO_DECODER,
      'Audio decoder',
      `${s.get(TellySettings.AUDIO_DECODER)} — ${BROWSER_DECIDES}`,
    ),
    value(
      RowIds.PLAYBACK_VIDEO_DECODER,
      'Video decoder',
      `${s.get(TellySettings.VIDEO_DECODER)} — ${BROWSER_DECIDES}`,
    ),
    value(RowIds.PLAYBACK_AFR, 'Auto frame rate (AFR)', s.get(TellySettings.AUTO_FRAME_RATE)),
    toggle(
      RowIds.PLAYBACK_SURROUND,
      'Select surround audio track by default',
      s.get(TellySettings.SURROUND_BY_DEFAULT),
    ),
    toggle(RowIds.PLAYBACK_PASSTHROUGH, 'Audio passthrough', s.get(TellySettings.AUDIO_PASSTHROUGH)),
    value(RowIds.PLAYBACK_EXTERNAL_PLAYER, 'Use external player', s.get(TellySettings.USE_EXTERNAL_PLAYER)),
    value(RowIds.PLAYBACK_RESIZE_MODE, 'Resize mode', s.get(TellySettings.RESIZE_MODE)),
    value(RowIds.PLAYBACK_SKIP_STEPS, 'Skip steps', s.get(TellySettings.SKIP_STEPS)),
  ];
}

/** Remote control pane rows (catalogue 64–65); the sub-panes are live. */
export function remoteControlRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.REMOTE_TV_GUIDE, 'TV guide'),
    value(RowIds.REMOTE_PLAYER, 'Player'),
    header('Seeking options'),
    toggle(
      RowIds.REMOTE_SEEK_RWFF,
      'Use RW/FF/Pause for seeking/pause while watching catch-up',
      s.get(TellySettings.SEEK_RWFF_CATCHUP),
    ),
    toggle(
      RowIds.REMOTE_RW_LIVE,
      'Use RW to rewind live stream with catch-up',
      s.get(TellySettings.RW_REWINDS_LIVE),
    ),
    toggle(
      RowIds.REMOTE_SEEK_LEFT_RIGHT,
      'Use Left/Right for seeking while watching catch-up',
      s.get(TellySettings.SEEK_LEFT_RIGHT),
    ),
    toggle(
      RowIds.REMOTE_LEFT_LIVE,
      'Use Left to rewind live stream with catch-up',
      s.get(TellySettings.LEFT_REWINDS_LIVE),
    ),
    toggle(
      RowIds.REMOTE_SEEK_DOWN_UP,
      'Use Down/Up for seeking while watching catch-up',
      s.get(TellySettings.SEEK_DOWN_UP),
    ),
    toggle(
      RowIds.REMOTE_DOWN_LIVE,
      'Use Down to rewind live stream with catch-up',
      s.get(TellySettings.DOWN_REWINDS_LIVE),
    ),
  ];
}

/** Remote control -> TV guide: the grid's remappable keys (summaries = persisted raw labels). */
export function remoteTvGuideRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.REMOTE_GUIDE_LEFT_RIGHT, 'Left/Right buttons', s.get(TellySettings.REMOTE_GUIDE_LEFT_RIGHT)),
    value(
      RowIds.REMOTE_GUIDE_CHANNEL_UP_DOWN,
      'Channel up/down buttons',
      s.get(TellySettings.REMOTE_GUIDE_CHANNEL_UP_DOWN),
    ),
    value(RowIds.REMOTE_GUIDE_LONG_OK, 'Long press OK', s.get(TellySettings.REMOTE_GUIDE_LONG_OK)),
  ];
}

/** Remote control -> Player: bare fullscreen-playback key remaps. */
export function remotePlayerRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.REMOTE_PLAYER_OK, 'OK button', s.get(TellySettings.REMOTE_PLAYER_OK)),
    value(RowIds.REMOTE_PLAYER_UP_DOWN, 'Up/Down buttons', s.get(TellySettings.REMOTE_PLAYER_UP_DOWN)),
    value(
      RowIds.REMOTE_PLAYER_LEFT_RIGHT,
      'Left/Right buttons',
      s.get(TellySettings.REMOTE_PLAYER_LEFT_RIGHT),
    ),
    value(RowIds.REMOTE_PLAYER_LONG_OK, 'Long press OK', s.get(TellySettings.REMOTE_PLAYER_LONG_OK)),
  ];
}
