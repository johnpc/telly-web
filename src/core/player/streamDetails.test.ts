import { describe, expect, it } from 'vitest';
import {
  badges,
  channelLayoutLabel,
  formatResolution,
  fpsLabel,
  mergeDetails,
  resolutionLabel,
  UNKNOWN_DETAILS,
} from './streamDetails';

describe('stream details badges', () => {
  it('1280×720 @ 25fps mono → HD · 25 FPS · MONO (capture 34)', () => {
    expect(badges({ width: 1280, height: 720, frameRate: 25, audioChannels: 1 })).toEqual([
      'HD',
      '25 FPS',
      'MONO',
    ]);
  });

  it('drops the badges whose facts are unknown', () => {
    expect(badges({ width: 0, height: 0, frameRate: 0, audioChannels: 2 })).toEqual(['STEREO']);
    expect(badges(UNKNOWN_DETAILS)).toEqual([]);
    expect(badges(null)).toEqual([]);
  });

  it('labels resolution tiers from the picture height', () => {
    expect(resolutionLabel(480)).toBe('SD');
    expect(resolutionLabel(720)).toBe('HD');
    expect(resolutionLabel(1080)).toBe('FHD');
    expect(resolutionLabel(2160)).toBe('UHD');
    expect(resolutionLabel(0)).toBeNull();
  });

  it('formats "1280 × 720" and rounds fps', () => {
    expect(formatResolution({ width: 1280, height: 720, frameRate: 0, audioChannels: 0 })).toBe('1280 × 720');
    expect(formatResolution(UNKNOWN_DETAILS)).toBeNull();
    expect(fpsLabel(29.97)).toBe('30 FPS');
    expect(fpsLabel(0)).toBeNull();
  });

  it('names channel layouts', () => {
    expect(channelLayoutLabel(1)).toBe('MONO');
    expect(channelLayoutLabel(2)).toBe('STEREO');
    expect(channelLayoutLabel(6)).toBe('5.1');
    expect(channelLayoutLabel(8)).toBe('7.1');
    expect(channelLayoutLabel(3)).toBe('SURROUND');
    expect(channelLayoutLabel(0)).toBeNull();
  });

  it('merge fills only unknown fields', () => {
    const base = { width: 1280, height: 720, frameRate: 0, audioChannels: 0 };
    expect(mergeDetails(base, { width: 1, frameRate: 25 })).toEqual({
      width: 1280,
      height: 720,
      frameRate: 25,
      audioChannels: 0,
    });
    expect(mergeDetails(UNKNOWN_DETAILS, {})).toEqual(UNKNOWN_DETAILS);
  });
});
