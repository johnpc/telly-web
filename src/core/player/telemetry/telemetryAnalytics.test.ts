import { beforeEach, describe, expect, it } from 'vitest';
import { PlaybackTelemetry } from './playbackTelemetry';
import { TelemetryAnalytics } from './telemetryAnalytics';
import { defineReadOnly, fakeTimeRanges, fire } from '../testSupport';

describe('TelemetryAnalytics', () => {
  let now: number;
  let lines: string[];
  let video: HTMLVideoElement;
  let analytics: TelemetryAnalytics;

  beforeEach(() => {
    now = 0;
    lines = [];
    video = document.createElement('video');
    analytics = new TelemetryAnalytics(
      new PlaybackTelemetry(
        () => now,
        (line) => lines.push(line),
      ),
      () => now,
    );
    analytics.bind(video);
  });

  it('maps element events onto Android-style state labels at the current position', () => {
    now = 100;
    fire(video, 'waiting');
    video.currentTime = 1.5;
    now = 1_100;
    fire(video, 'playing');
    fire(video, 'pause');
    fire(video, 'seeking');
    fire(video, 'ended');
    fire(video, 'emptied');
    expect(lines).toEqual([
      'state IDLE -> BUFFERING after 100ms at 0ms',
      'state BUFFERING -> READY/playing after 1000ms at 1500ms',
      'state READY/playing -> READY/paused after 0ms at 1500ms',
      'state READY/paused -> BUFFERING after 0ms at 1500ms',
      'state BUFFERING -> ENDED after 0ms at 1500ms',
      'state ENDED -> IDLE after 0ms at 1500ms',
    ]);
  });

  it('notes element errors', () => {
    defineReadOnly(video, 'error', { code: 3, message: 'decode' });
    fire(video, 'error');
    expect(lines).toEqual(['player error 3: decode']);
  });

  it('frame-count deltas stand in for a frame callback; dropped bursts are reported per sample', () => {
    const quality = { totalVideoFrames: 0, droppedVideoFrames: 0, corruptedVideoFrames: 0, creationTime: 0 };
    video.getVideoPlaybackQuality = () => quality;
    defineReadOnly(video, 'paused', false);
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 10]]));

    quality.totalVideoFrames = 50;
    video.currentTime = 1;
    analytics.sample();
    now = 2_000;
    quality.droppedVideoFrames = 7;
    video.currentTime = 3;
    analytics.sample();
    now = 4_000;
    video.currentTime = 5;
    analytics.sample();
    expect(lines).toEqual([
      'dropped 7 frames in 2000ms',
      'VIDEO FROZEN: no frame for 2000ms while audio advances, 7000ms buffered',
    ]);
  });

  it('unbind stops listening and sampling', () => {
    analytics.unbind();
    fire(video, 'waiting');
    analytics.sample();
    expect(lines).toEqual([]);
  });
});
