// Track models for the quick-bar pickers (port of Android's `TrackModels`).
// Ids are engine-specific opaque strings ("level:2", "audio:0", …) that the
// transport that produced the snapshot knows how to apply.

/** One selectable video rendition; `bitrate` <= 0 when the container omits it. */
export interface VideoTrack {
  id: string;
  width: number;
  height: number;
  bitrate: number;
}

/** One selectable audio track; `language` is null when undeclared. */
export interface AudioTrack {
  id: string;
  language: string | null;
  channels: number;
}

/** One selectable text/CC track; `language` is null when undeclared. */
export interface TextTrack {
  id: string;
  language: string | null;
}

/**
 * What the tuned stream offers and what is picked right now, feeding the
 * quick-bar picker dialogs. `videoOverrideId` null = adaptive "Auto";
 * `selectedTextId` null = captions off (the engine's default).
 */
export interface TrackSnapshot {
  videos: VideoTrack[];
  audios: AudioTrack[];
  texts: TextTrack[];
  videoOverrideId: string | null;
  selectedAudioId: string | null;
  selectedTextId: string | null;
}

export const NO_TRACKS: TrackSnapshot = {
  videos: [],
  audios: [],
  texts: [],
  videoOverrideId: null,
  selectedAudioId: null,
  selectedTextId: null,
};

/** The language tag as declared, or null for blank / "und". */
export function languageOrNull(code: string | undefined): string | null {
  if (code === undefined || code.trim() === '' || code === 'und') return null;
  return code;
}
