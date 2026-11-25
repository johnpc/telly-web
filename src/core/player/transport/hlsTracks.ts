// Pure hls.js → TrackSnapshot / StreamDetails mapping, kept out of the
// transport so it tests flat against plain objects (no Hls instance).
// Ids: "level:<index>" for renditions, "audio:<id>" / "text:<id>" for
// alternate media playlists.
import type { StreamDetails } from '../telemetry/streamDetails';
import type { AudioTrack, TextTrack, TrackSnapshot, VideoTrack } from '../engine/trackModels';
import { languageOrNull } from '../engine/trackModels';

export interface HlsLevelLike {
  width: number;
  height: number;
  bitrate: number;
  frameRate: number;
}

export interface HlsMediaLike {
  id: number;
  lang?: string;
  channels?: string;
}

/** The slice of an `Hls` instance the mapping reads. */
export interface HlsTrackSource {
  levels: HlsLevelLike[];
  currentLevel: number;
  autoLevelEnabled: boolean;
  audioTracks: HlsMediaLike[];
  audioTrack: number;
  subtitleTracks: HlsMediaLike[];
  subtitleTrack: number;
  subtitleDisplay: boolean;
}

export const LEVEL_PREFIX = 'level:';
export const AUDIO_PREFIX = 'audio:';
export const TEXT_PREFIX = 'text:';

/** "level:2" → 2; null for a foreign id. */
export function indexOfId(id: string, prefix: string): number | null {
  if (!id.startsWith(prefix)) return null;
  const n = Number.parseInt(id.slice(prefix.length), 10);
  return Number.isInteger(n) ? n : null;
}

function videoTrack(level: HlsLevelLike, index: number): VideoTrack {
  return { id: `${LEVEL_PREFIX}${index}`, width: level.width, height: level.height, bitrate: level.bitrate };
}

function audioTrack(media: HlsMediaLike): AudioTrack {
  const channels = Number.parseInt(media.channels ?? '', 10);
  return {
    id: `${AUDIO_PREFIX}${media.id}`,
    language: languageOrNull(media.lang),
    channels: Number.isInteger(channels) ? channels : 0,
  };
}

function textTrack(media: HlsMediaLike): TextTrack {
  return { id: `${TEXT_PREFIX}${media.id}`, language: languageOrNull(media.lang) };
}

export function mapHlsTracks(hls: HlsTrackSource): TrackSnapshot {
  const audio = hls.audioTracks.find((t) => t.id === hls.audioTrack);
  const text = hls.subtitleDisplay ? hls.subtitleTracks.find((t) => t.id === hls.subtitleTrack) : undefined;
  return {
    videos: hls.levels.map(videoTrack),
    audios: hls.audioTracks.map(audioTrack),
    texts: hls.subtitleTracks.map(textTrack),
    videoOverrideId:
      hls.autoLevelEnabled || hls.currentLevel < 0 ? null : `${LEVEL_PREFIX}${hls.currentLevel}`,
    selectedAudioId: audio === undefined ? null : `${AUDIO_PREFIX}${audio.id}`,
    selectedTextId: text === undefined ? null : `${TEXT_PREFIX}${text.id}`,
  };
}

/** What the playing level + audio playlist declare; zeros where undeclared. */
export function hlsDetails(hls: HlsTrackSource): Partial<StreamDetails> {
  const level = hls.levels[hls.currentLevel];
  const audio = hls.audioTracks.find((t) => t.id === hls.audioTrack);
  const channels = Number.parseInt(audio?.channels ?? '', 10);
  return {
    width: level?.width ?? 0,
    height: level?.height ?? 0,
    frameRate: level?.frameRate ?? 0,
    audioChannels: Number.isInteger(channels) ? channels : 0,
  };
}
