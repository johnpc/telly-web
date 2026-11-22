import type { QuickBarAction } from '../quickbar/quickBar';

/** The four quick-bar stream slots that open a picker dialog over playback (ux-spec §3.14). */
export type TrackPickerKind = 'Video' | 'Audio' | 'Sync' | 'Subtitles';

export const PICKER_TITLES: Readonly<Record<TrackPickerKind, string>> = {
  Video: 'Video track',
  Audio: 'Audio track',
  Sync: 'Audio sync',
  Subtitles: 'Closed captions',
};

const BY_ACTION: Readonly<Partial<Record<QuickBarAction, TrackPickerKind>>> = {
  'Video track': 'Video',
  'Audio track': 'Audio',
  Latency: 'Sync',
  Subtitles: 'Subtitles',
};

/** The picker a quick-bar slot opens; null for the navigation slots. */
export function pickerKindOf(action: QuickBarAction): TrackPickerKind | null {
  return BY_ACTION[action] ?? null;
}
