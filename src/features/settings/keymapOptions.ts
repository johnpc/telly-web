/**
 * Remote-control key-remap option lists (the labels ARE the stored raw
 * values; port of Android `PlayerKeymap.kt` + `GuideKeymap.kt`). The
 * playback and guide slices parse the same labels; defaults are the
 * device-verified key map (see `TellySettings.REMOTE_*`).
 */
export const PLAYER_OK_ACTIONS: readonly string[] = ['Show info panel', 'Open channels list', 'Nothing'];
export const PLAYER_UP_DOWN_ACTIONS: readonly string[] = ['Show info panel', 'Switch channels', 'Nothing'];
export const PLAYER_LEFT_RIGHT_ACTIONS: readonly string[] = ['Nothing', 'Switch channels'];
export const PLAYER_LONG_OK_ACTIONS: readonly string[] = ['Open quick menu', 'Open channels list'];

export const GUIDE_LEFT_RIGHT_ACTIONS: readonly string[] = ['Move by programme', 'Move by page'];
export const GUIDE_CHANNEL_KEYS_ACTIONS: readonly string[] = [
  'Nothing',
  'Page the channel list',
  'Move by day',
];
export const GUIDE_LONG_OK_ACTIONS: readonly string[] = ['Open channel menu', 'Play channel'];

/** Playback -> "Auto frame rate (AFR)" variants (Android `AfrPreference`). */
export const AFR_OPTIONS: readonly string[] = ['Off', 'On', 'On (also switch refresh rate on stop)'];

/** Playback -> "Use external player" (Android `ExternalPlayerSetting`). */
export const EXTERNAL_PLAYER_OPTIONS: readonly string[] = ['Off', 'On'];

/** Playback -> "Skip steps" presets (Android `SkipSteps.PRESETS`). */
export const SKIP_STEP_PRESETS: readonly string[] = [
  '10s / 30s / 1m / 5m',
  '5s / 15s / 30s / 1m',
  '30s / 1m / 5m / 10m',
  '1m / 5m / 15m / 30m',
];

/** Playback -> "Resize mode" (the player seam's modes). */
export const RESIZE_MODE_OPTIONS: readonly string[] = ['Fit', 'Fill', 'Zoom', 'Fixed width', 'Fixed height'];

/** Parses a persisted picker label; unknown raws fall back to `fallback`. */
export function keymapChoice(raw: string, options: readonly string[], fallback: string): string {
  return options.includes(raw) ? raw : fallback;
}
