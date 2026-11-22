import { appLanguageTagFor } from '@/core/settings/appLanguage';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { accentHexFor } from './accentPalette';

/** Appearance -> Font size label -> the `--telly-font-scale` multiplier. */
export const FONT_SCALES: Readonly<Record<string, number>> = {
  Small: 0.875,
  Medium: 1,
  Large: 1.125,
  Huge: 1.25,
};

export function fontScaleFor(label: string): number {
  return FONT_SCALES[label] ?? 1;
}

/** The slice of `document.documentElement` appearance writes to; tests pass a fake. */
export interface AppearanceRoot {
  style: Pick<CSSStyleDeclaration, 'setProperty'>;
  lang: string;
}

/**
 * Applies Settings -> Appearance to the document: the accent (`--telly-accent`,
 * the colour every focus pill/header reads), the font scale
 * (`--telly-font-scale`, the root `font-size` multiplier) and the UI
 * language (`<html lang>`; "System" clears it so the browser language wins).
 */
export function applyAppearance(
  settings: SettingsRepository,
  root: AppearanceRoot = document.documentElement,
): void {
  root.style.setProperty('--telly-accent', accentHexFor(settings.get(TellySettings.ACCENT_COLOR)));
  root.style.setProperty('--telly-font-scale', String(fontScaleFor(settings.get(TellySettings.FONT_SIZE))));
  root.lang = appLanguageTagFor(settings.get(TellySettings.LANGUAGE)) ?? '';
}

/** Applies now and on every change of the three appearance settings; returns the unsubscribe. */
export function observeAppearance(
  settings: SettingsRepository,
  root: AppearanceRoot = document.documentElement,
): () => void {
  const apply = (): void => applyAppearance(settings, root);
  apply();
  const stops = [TellySettings.ACCENT_COLOR, TellySettings.FONT_SIZE, TellySettings.LANGUAGE].map((setting) =>
    settings.observe(setting, apply),
  );
  return () => stops.forEach((stop) => stop());
}
