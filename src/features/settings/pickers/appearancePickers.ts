import { APP_LANGUAGE_OPTIONS } from '@/core/settings/appLanguage';
import { TellySettings } from '@/core/settings/tellySettings';
import { accentNames, themeLabel } from '../accentPalette';
import { RowIds } from '../rowIds';
import { numbered, pickerOf, sameRaw, type PickerSpec } from './pickerSpec';

/** Appearance -> Font size options (ux-spec); the scale each applies to `--telly-font-scale`. */
export const FONT_SIZE_OPTIONS: readonly string[] = ['Small', 'Medium', 'Large', 'Huge'];

/**
 * The Appearance pickers (port of Android `SettingsPickersAppearance.kt`).
 * Option lists follow the ux-spec where stated (font size, language) and
 * the most TiviMate-plausible minimal set otherwise.
 */
export const appearancePickerSpecs: readonly PickerSpec[] = [
  pickerOf(
    RowIds.APPEARANCE_COLOR_THEME,
    'Color theme',
    TellySettings.ACCENT_COLOR,
    accentNames().map((name) => ({ label: themeLabel(name), raw: name })),
  ),
  pickerOf(
    RowIds.APPEARANCE_GUIDE_VISIBLE_CHANNELS,
    'Number of visible channels',
    TellySettings.GUIDE_VISIBLE_CHANNELS,
    numbered([6, 7, 8, 9]),
  ),
  pickerOf(
    RowIds.APPEARANCE_GUIDE_TRANSPARENCY,
    'Panel transparency',
    TellySettings.GUIDE_TRANSPARENCY,
    sameRaw(['Opaque', '90%', '80%', '70%']),
  ),
  pickerOf(
    RowIds.APPEARANCE_PLAYER_TRANSPARENCY,
    'Panels transparency',
    TellySettings.PLAYER_TRANSPARENCY,
    numbered([0, 10, 25, 50], (n) => `${n}%`),
  ),
  pickerOf(
    RowIds.APPEARANCE_PLAYER_TIMEOUT,
    'Panels timeout, sec',
    TellySettings.PLAYER_PANEL_TIMEOUT_SEC,
    numbered([2, 5, 8, 10]),
  ),
  pickerOf(
    RowIds.APPEARANCE_LOGOS_BACKGROUND,
    'Logo background',
    TellySettings.LOGO_BACKGROUND,
    sameRaw(['Default', 'Transparent', 'Dark', 'Light']),
  ),
  pickerOf(RowIds.APPEARANCE_LANGUAGE, 'Language', TellySettings.LANGUAGE, sameRaw(APP_LANGUAGE_OPTIONS)),
  pickerOf(RowIds.APPEARANCE_FONT_SIZE, 'Font size', TellySettings.FONT_SIZE, sameRaw(FONT_SIZE_OPTIONS)),
];
