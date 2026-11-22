/**
 * Appearance → Player → "Panels timeout, sec", resolved to the three overlay
 * auto-hide durations. The default 5 s maps to EXACTLY the measured
 * constants (5.35 s info / 5.5 s zap / 5 s quick-bar); other choices keep
 * the same measured offsets over the chosen base (Android `PanelTimeouts`).
 */
export interface PanelTimeouts {
  infoMs: number;
  zapMs: number;
  quickBarMs: number;
}

const MS_PER_SECOND = 1_000;
const INFO_EXTRA_MS = 350;
const ZAP_EXTRA_MS = 500;

export function panelTimeoutsForSeconds(seconds: number): PanelTimeouts {
  const base = Math.max(1, seconds) * MS_PER_SECOND;
  return { infoMs: base + INFO_EXTRA_MS, zapMs: base + ZAP_EXTRA_MS, quickBarMs: base };
}

export const DEFAULT_PANEL_TIMEOUTS: PanelTimeouts = panelTimeoutsForSeconds(5);
