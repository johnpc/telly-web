import type { StreamDetails } from '@/core/player';
import { TrackLabels } from '../tracks/trackLabels';

/** The nine quick-bar slots, left to right (round3-ref 07). */
export const QUICK_BAR_ACTIONS = [
  'Search',
  'Channels list',
  'Recordings',
  'Multiview',
  'Picture-in-picture',
  'Video track',
  'Audio track',
  'Latency',
  'Subtitles',
] as const;

export type QuickBarAction = (typeof QUICK_BAR_ACTIONS)[number];

/** One icon of the playback quick-bar with its live label. */
export interface QuickBarItem {
  action: QuickBarAction;
  label: string;
}

/**
 * Long-OK / MENU at fullscreen opens this bottom icon bar: Search · Channels
 * list · Recordings · Multiview · Picture-in-picture · 1280 × 720 · Mono ·
 * 0 ms · Off(CC). The four stream slots read their labels live.
 */
export function quickBarItems(
  details: StreamDetails | null,
  sync: string,
  subtitles: string,
): QuickBarItem[] {
  const live: Partial<Record<QuickBarAction, string>> = {
    'Video track': TrackLabels.resolutionSlot(details),
    'Audio track': TrackLabels.audioSlot(details),
    Latency: sync,
    Subtitles: subtitles,
  };
  return QUICK_BAR_ACTIONS.map((action) => ({ action, label: live[action] ?? action }));
}
