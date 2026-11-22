import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { ROW_HEIGHT_DP, VISIBLE_ROWS } from './guideGeometry';

/** Appearance -> TV guide, resolved to render values (Android `GuideStyle`). */
export interface GuideStyle {
  rowHeightDp: number;
  backgroundAlpha: number;
  showChannelNumbers: boolean;
  visibleRows: number;
}

const ALPHAS: Readonly<Record<string, number>> = { '90%': 0.9, '80%': 0.8, '70%': 0.7 };

/** Row pitch scaled so `visibleChannels` rows fill today's 7-row band. */
export function rowHeightFor(visibleChannels: number): number {
  return (ROW_HEIGHT_DP * VISIBLE_ROWS) / Math.max(1, visibleChannels);
}

/** "Panel transparency" labels -> guide background alpha. */
export function backgroundAlphaFor(label: string): number {
  return ALPHAS[label] ?? 1;
}

export function guideStyleFrom(settings: SettingsRepository): GuideStyle {
  const visibleRows = Math.max(1, settings.get(TellySettings.GUIDE_VISIBLE_CHANNELS));
  return {
    rowHeightDp: rowHeightFor(visibleRows),
    backgroundAlpha: backgroundAlphaFor(settings.get(TellySettings.GUIDE_TRANSPARENCY)),
    showChannelNumbers: settings.get(TellySettings.SHOW_CHANNEL_NUMBERS),
    visibleRows,
  };
}
