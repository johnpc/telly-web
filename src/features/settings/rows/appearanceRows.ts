import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { themeLabel } from '../accentPalette';
import { RowIds } from '../rowIds';
import { type SettingsRow, toggle, value } from '../settingsRow';
import type { SettingsPane } from '../settingsUiState';

/**
 * Appearance pane rows (catalogue 59), all live: the four sub-screens push
 * their panes, Language/Font size open pickers, Color theme is the accent
 * picker (port of Android `SettingsRowsAppearance*.kt`).
 */
export function appearanceRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.APPEARANCE_TV_GUIDE, 'TV guide'),
    value(RowIds.APPEARANCE_PLAYER, 'Player'),
    value(RowIds.APPEARANCE_GROUPS, 'Groups'),
    value(RowIds.APPEARANCE_LOGOS, 'Logos'),
    value(RowIds.APPEARANCE_LANGUAGE, 'Language', s.get(TellySettings.LANGUAGE)),
    value(RowIds.APPEARANCE_FONT_SIZE, 'Font size', s.get(TellySettings.FONT_SIZE)),
    value(RowIds.APPEARANCE_COLOR_THEME, 'Color theme', themeLabel(s.get(TellySettings.ACCENT_COLOR))),
  ];
}

export function appearanceTvGuideRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(
      RowIds.APPEARANCE_GUIDE_VISIBLE_CHANNELS,
      'Number of visible channels',
      String(s.get(TellySettings.GUIDE_VISIBLE_CHANNELS)),
    ),
    value(
      RowIds.APPEARANCE_GUIDE_TRANSPARENCY,
      'Panel transparency',
      s.get(TellySettings.GUIDE_TRANSPARENCY),
    ),
    toggle(
      RowIds.APPEARANCE_GUIDE_CHANNEL_NUMBERS,
      'Show channel numbers',
      s.get(TellySettings.SHOW_CHANNEL_NUMBERS),
    ),
  ];
}

export function appearancePlayerRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(
      RowIds.APPEARANCE_PLAYER_TRANSPARENCY,
      'Panels transparency',
      `${s.get(TellySettings.PLAYER_TRANSPARENCY)}%`,
    ),
    value(
      RowIds.APPEARANCE_PLAYER_TIMEOUT,
      'Panels timeout, sec',
      String(s.get(TellySettings.PLAYER_PANEL_TIMEOUT_SEC)),
    ),
    toggle(RowIds.APPEARANCE_PLAYER_SHOW_CLOCK, 'Show clock', s.get(TellySettings.PLAYER_SHOW_CLOCK)),
  ];
}

export function appearanceGroupsRows(s: SettingsRepository): SettingsRow[] {
  return [
    toggle(
      RowIds.APPEARANCE_GROUPS_ALL_CHANNELS,
      "Show 'All channels' group",
      s.get(TellySettings.SHOW_ALL_CHANNELS_GROUP),
    ),
    toggle(
      RowIds.APPEARANCE_GROUPS_FAVORITES,
      "Show 'Favorites' group",
      s.get(TellySettings.SHOW_FAVORITES_GROUP),
    ),
  ];
}

export function appearanceLogosRows(s: SettingsRepository): SettingsRow[] {
  return [
    value(RowIds.APPEARANCE_LOGOS_BACKGROUND, 'Logo background', s.get(TellySettings.LOGO_BACKGROUND)),
    toggle(RowIds.APPEARANCE_LOGOS_ROUNDED, 'Rounded corners', s.get(TellySettings.LOGO_ROUNDED_CORNERS)),
  ];
}

const SUB_PANES: Readonly<Record<string, SettingsPane>> = {
  [RowIds.APPEARANCE_TV_GUIDE]: { kind: 'AppearanceTvGuide' },
  [RowIds.APPEARANCE_PLAYER]: { kind: 'AppearancePlayer' },
  [RowIds.APPEARANCE_GROUPS]: { kind: 'AppearanceGroups' },
  [RowIds.APPEARANCE_LOGOS]: { kind: 'AppearanceLogos' },
};

/** The Appearance rows that push a sub-pane, for the action dispatcher. */
export function appearancePaneFor(rowId: string): SettingsPane | null {
  return SUB_PANES[rowId] ?? null;
}
