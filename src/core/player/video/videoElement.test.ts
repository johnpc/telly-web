import { describe, expect, it } from 'vitest';
import { defineReadOnly, fakeTimeRanges } from '../testSupport';
import {
  bufferedAheadMsOf,
  bufferedRangesOf,
  createVideoElement,
  durationMsOf,
  moveVideoTo,
  playbackQualityOf,
  positionMsOf,
  safePlay,
  VIDEO_TESTID,
} from './videoElement';

describe('video element helpers', () => {
  it('creates the one TV-friendly <video>: inline, autoplay, unmuted, no controls, test hooks', () => {
    const video = createVideoElement();
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(false);
    expect(video.controls).toBe(false);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.dataset.testid).toBe(VIDEO_TESTID);
    expect(video.dataset.state).toBe('Idle');
    expect(video.style.objectFit).toBe('contain');
  });

  it('re-parents the same node and is idempotent', () => {
    const video = createVideoElement();
    const a = document.createElement('div');
    const b = document.createElement('div');
    moveVideoTo(video, a);
    moveVideoTo(video, a);
    expect(a.children).toHaveLength(1);
    moveVideoTo(video, b);
    expect(a.children).toHaveLength(0);
    expect(b.firstChild).toBe(video);
  });

  it('safePlay swallows rejections and synchronous throws', async () => {
    const video = createVideoElement();
    video.play = () => Promise.reject(new Error('NotAllowedError'));
    safePlay(video);
    video.play = () => {
      throw new Error('not implemented');
    };
    expect(() => safePlay(video)).not.toThrow();
    await Promise.resolve();
  });

  it('reads position, duration and buffered ranges in ms', () => {
    const video = createVideoElement();
    video.currentTime = 2.5;
    expect(positionMsOf(video)).toBe(2500);
    expect(durationMsOf(video)).toBe(0);
    defineReadOnly(video, 'duration', 61.2);
    expect(durationMsOf(video)).toBe(61_200);
    defineReadOnly(video, 'duration', Number.POSITIVE_INFINITY);
    expect(durationMsOf(video)).toBe(Number.POSITIVE_INFINITY);
    defineReadOnly(
      video,
      'buffered',
      fakeTimeRanges([
        [0, 1],
        [2, 6],
      ]),
    );
    expect(bufferedRangesOf(video)).toEqual([
      { startMs: 0, endMs: 1000 },
      { startMs: 2000, endMs: 6000 },
    ]);
    expect(bufferedAheadMsOf(video)).toBe(3500);
    video.currentTime = 1.5;
    expect(bufferedAheadMsOf(video)).toBe(0);
  });

  it('playback quality is null where the browser lacks it', () => {
    const video = createVideoElement();
    expect(playbackQualityOf(video)).toBeNull();
    const quality = { totalVideoFrames: 1, droppedVideoFrames: 0, corruptedVideoFrames: 0, creationTime: 0 };
    video.getVideoPlaybackQuality = () => quality;
    expect(playbackQualityOf(video)).toBe(quality);
  });
});
