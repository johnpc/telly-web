import { type ChannelRow, displayName } from '@/core/db/types';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { RowIds } from '../rowIds';
import { action, header, note, type SettingsRow, toggle, value } from '../settingsRow';

/**
 * Parental controls pane rows (catalogue 67/69; port of Android
 * `SettingsRowsParental.kt`). The master toggle's title IS its state
 * ("Off"/"On") in the capture.
 */
export function parentalRows(s: SettingsRepository): SettingsRow[] {
  const enabled = s.get(TellySettings.PARENTAL_ENABLED);
  return [
    toggle(RowIds.PARENTAL_MASTER, enabled ? 'On' : 'Off', enabled),
    action(RowIds.PARENTAL_CHANGE_PIN, 'Change PIN'),
    value(RowIds.PARENTAL_PIN_INPUT, 'PIN input method', s.get(TellySettings.PARENTAL_PIN_INPUT_METHOD)),
    value(RowIds.PARENTAL_RELOCK, "Don't require PIN after unlocking", s.get(TellySettings.PARENTAL_RELOCK)),
    toggle(
      RowIds.PARENTAL_CHANNELS_ONLY,
      "Don't require for channels only",
      s.get(TellySettings.PARENTAL_CHANNELS_ONLY),
    ),
    action(RowIds.PARENTAL_BLOCKED_CHANNELS, 'Blocked channels'),
    header('Require PIN for'),
    toggle(RowIds.PARENTAL_REQUIRE_SETTINGS, 'Settings', s.get(TellySettings.PARENTAL_REQUIRE_FOR_SETTINGS)),
    toggle(
      RowIds.PARENTAL_REQUIRE_PLAYLISTS,
      'Settings | Playlists',
      s.get(TellySettings.PARENTAL_REQUIRE_FOR_PLAYLISTS),
    ),
  ];
}

/**
 * Parental controls -> Blocked channels: one row per blocked channel, OK
 * unblocks it (the pane entry itself is PIN-gated once).
 */
export function blockedChannelRows(blocked: readonly ChannelRow[]): SettingsRow[] {
  if (blocked.length === 0) return [note('No blocked channels', false)];
  return blocked.map((channel) =>
    value(RowIds.BLOCKED_CHANNEL_PREFIX + channel.id, displayName(channel), 'OK unblocks'),
  );
}
