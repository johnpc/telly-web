import { describe, expect, it, vi } from 'vitest';
import { defineReadOnly } from './testSupport';
import { UNKNOWN_DETAILS } from './streamDetails';
import { VideoFeed } from './videoFeed';

describe('VideoFeed', () => {
  it('snapshots the picture size at READY and lets transport facts fill unknown fields', () => {
    const feed = new VideoFeed();
    const video = document.createElement('video');
    defineReadOnly(video, 'videoWidth', 1280);
    defineReadOnly(video, 'videoHeight', 720);
    feed.attach(video);
    feed.onReady();
    feed.merge({ audioChannels: 1, width: 1 });
    expect(feed.details).toEqual({ width: 1280, height: 720, frameRate: 0, audioChannels: 1 });
    feed.reset();
    expect(feed.details).toEqual(UNKNOWN_DETAILS);
  });

  it('estimates fps from presented frames (TS declares none) and fans each frame out', () => {
    const onFrame = vi.fn();
    const feed = new VideoFeed(onFrame);
    for (let i = 0; i < 14; i += 1) feed.onFrameAt(i * 0.04);
    expect(onFrame).toHaveBeenCalledTimes(14);
    expect(feed.details.frameRate).toBe(25);
  });

  it('pumps requestVideoFrameCallback where available and retires the loop on detach', () => {
    const callbacks: VideoFrameRequestCallback[] = [];
    const video = document.createElement('video');
    video.requestVideoFrameCallback = (cb) => {
      callbacks.push(cb);
      return callbacks.length;
    };
    const onFrame = vi.fn();
    const feed = new VideoFeed(onFrame);
    feed.attach(video);
    expect(callbacks).toHaveLength(1);
    callbacks[0]?.(0, metadata(0.04));
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(2);
    feed.detach();
    callbacks[1]?.(0, metadata(0.08));
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(2);
  });

  it('onReady without an element is a no-op', () => {
    const feed = new VideoFeed();
    feed.onReady();
    expect(feed.details).toEqual(UNKNOWN_DETAILS);
  });
});

function metadata(mediaTime: number): VideoFrameCallbackMetadata {
  return { mediaTime, expectedDisplayTime: 0, presentationTime: 0, presentedFrames: 0, width: 0, height: 0 };
}
