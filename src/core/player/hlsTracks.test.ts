import { describe, expect, it } from 'vitest';
import { hlsDetails, indexOfId, mapHlsTracks, type HlsTrackSource } from './hlsTracks';

const source: HlsTrackSource = {
  levels: [
    { width: 640, height: 360, bitrate: 800_000, frameRate: 25 },
    { width: 1280, height: 720, bitrate: 2_500_000, frameRate: 50 },
  ],
  currentLevel: 1,
  autoLevelEnabled: true,
  audioTracks: [{ id: 0, lang: 'en', channels: '2' }, { id: 1, lang: 'und', channels: '6' }, { id: 2 }],
  audioTrack: 1,
  subtitleTracks: [{ id: 0, lang: 'de' }, { id: 1 }],
  subtitleTrack: 0,
  subtitleDisplay: false,
};

describe('hls track mapping', () => {
  it('maps levels, audio and subtitle playlists with stable ids', () => {
    const snapshot = mapHlsTracks(source);
    expect(snapshot.videos).toEqual([
      { id: 'level:0', width: 640, height: 360, bitrate: 800_000 },
      { id: 'level:1', width: 1280, height: 720, bitrate: 2_500_000 },
    ]);
    expect(snapshot.audios).toEqual([
      { id: 'audio:0', language: 'en', channels: 2 },
      { id: 'audio:1', language: null, channels: 6 },
      { id: 'audio:2', language: null, channels: 0 },
    ]);
    expect(snapshot.texts).toEqual([
      { id: 'text:0', language: 'de' },
      { id: 'text:1', language: null },
    ]);
  });

  it('auto level = no video override; a manual level is the override; captions Off hides the text pick', () => {
    expect(mapHlsTracks(source).videoOverrideId).toBeNull();
    expect(mapHlsTracks({ ...source, autoLevelEnabled: false }).videoOverrideId).toBe('level:1');
    expect(mapHlsTracks({ ...source, autoLevelEnabled: false, currentLevel: -1 }).videoOverrideId).toBeNull();
    expect(mapHlsTracks(source).selectedAudioId).toBe('audio:1');
    expect(mapHlsTracks(source).selectedTextId).toBeNull();
    expect(mapHlsTracks({ ...source, subtitleDisplay: true }).selectedTextId).toBe('text:0');
    expect(mapHlsTracks({ ...source, audioTrack: 9 }).selectedAudioId).toBeNull();
  });

  it('details come from the playing level and the selected audio playlist', () => {
    expect(hlsDetails(source)).toEqual({ width: 1280, height: 720, frameRate: 50, audioChannels: 6 });
    expect(hlsDetails({ ...source, currentLevel: -1, audioTrack: 2 })).toEqual({
      width: 0,
      height: 0,
      frameRate: 0,
      audioChannels: 0,
    });
  });

  it('parses ids back to indices and rejects foreign ids', () => {
    expect(indexOfId('level:2', 'level:')).toBe(2);
    expect(indexOfId('audio:2', 'level:')).toBeNull();
    expect(indexOfId('level:x', 'level:')).toBeNull();
  });
});
