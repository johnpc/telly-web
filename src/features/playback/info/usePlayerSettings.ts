import { TellySettings } from '@/core/settings/tellySettings';
import { useSetting } from '@/core/settings/useSetting';
import { clockStyleOf, type ClockStyle } from './clockStyle';

/** Appearance → "Clock format" as a `ClockStyle`. */
export function useClockStyle(): ClockStyle {
  const [raw] = useSetting(TellySettings.CLOCK_FORMAT);
  return clockStyleOf(raw);
}

/**
 * Appearance → Player, resolved to render values for the playback panels:
 * "Panels transparency" is EXTRA transparency over the sampled alphas (0% =
 * today's rendering), "Show clock" drives the top-scrim clock (Android `PanelStyle`).
 */
export interface PanelStyle {
  alphaFactor: number;
  showClock: boolean;
}

export function panelStyleOf(extraTransparencyPercent: number, showClock: boolean): PanelStyle {
  const clamped = Math.min(Math.max(extraTransparencyPercent, 0), 100);
  return { alphaFactor: 1 - clamped / 100, showClock };
}

export function usePanelStyle(): PanelStyle {
  const [transparency] = useSetting(TellySettings.PLAYER_TRANSPARENCY);
  const [showClock] = useSetting(TellySettings.PLAYER_SHOW_CLOCK);
  return panelStyleOf(transparency, showClock);
}
