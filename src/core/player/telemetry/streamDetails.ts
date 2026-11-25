// Stream characteristics feeding the info-overlay badges (port of Android's
// `VideoDetails` + `PlaybackBadges`). Capture 34 shows "HD", "25 FPS",
// "MONO" for the 1280x720 25fps mono fixture; unknown dimensions simply
// drop their badge.

export interface StreamDetails {
  width: number;
  height: number;
  /** Frames per second; 0 when unknown (raw TS never declares it). */
  frameRate: number;
  /** Audio channel count; 0 when unknown. */
  audioChannels: number;
}

export const UNKNOWN_DETAILS: StreamDetails = { width: 0, height: 0, frameRate: 0, audioChannels: 0 };

const UHD_HEIGHT = 2160;
const FHD_HEIGHT = 1080;
const HD_HEIGHT = 720;

/** "SD" · "HD" · "FHD" · "UHD" from the picture height; null when unknown. */
export function resolutionLabel(height: number): string | null {
  if (height <= 0) return null;
  if (height >= UHD_HEIGHT) return 'UHD';
  if (height >= FHD_HEIGHT) return 'FHD';
  if (height >= HD_HEIGHT) return 'HD';
  return 'SD';
}

/** "1280 × 720"; null when either dimension is unknown. */
export function formatResolution(details: StreamDetails): string | null {
  if (details.width <= 0 || details.height <= 0) return null;
  return `${details.width} × ${details.height}`;
}

/** "25 FPS"; null when unknown. */
export function fpsLabel(frameRate: number): string | null {
  return frameRate > 0 ? `${Math.round(frameRate)} FPS` : null;
}

const CHANNEL_LAYOUTS: Readonly<Record<number, string>> = {
  1: 'MONO',
  2: 'STEREO',
  6: '5.1',
  8: '7.1',
};

/** "MONO" · "STEREO" · "5.1" · "7.1" · "SURROUND"; null when unknown. */
export function channelLayoutLabel(channels: number): string | null {
  if (channels <= 0) return null;
  return CHANNEL_LAYOUTS[channels] ?? 'SURROUND';
}

/** The info-overlay badge row, e.g. ["HD", "25 FPS", "MONO"]. */
export function badges(details: StreamDetails | null): string[] {
  if (details === null) return [];
  const row = [
    resolutionLabel(details.height),
    fpsLabel(details.frameRate),
    channelLayoutLabel(details.audioChannels),
  ];
  return row.filter((label): label is string => label !== null);
}

const DETAIL_KEYS = ['width', 'height', 'frameRate', 'audioChannels'] as const;

/** Fills only the unknown (zero) fields of `base` from `patch`. */
export function mergeDetails(base: StreamDetails, patch: Partial<StreamDetails>): StreamDetails {
  const out = { ...base };
  for (const key of DETAIL_KEYS) {
    if (out[key] <= 0) out[key] = patch[key] ?? 0;
  }
  return out;
}
