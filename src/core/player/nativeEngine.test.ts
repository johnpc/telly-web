import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeTransport } from './nativeEngine';
import { fire, stubMediaPlayback } from './testSupport';
import type { TransportListener } from './transport';

function listener(): TransportListener & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    onTracksChanged: (s) => calls.push(['tracks', s]),
    onDetails: (d) => calls.push(['details', d]),
    onError: (m) => calls.push(['error', m]),
  };
}

describe('NativeTransport', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    stubMediaPlayback();
    video = document.createElement('video');
  });

  it('sets src, reports empty tracks and the element size', async () => {
    const transport = new NativeTransport();
    const l = listener();
    await transport.load(video, 'http://s/vod.mp4', { live: false }, l);
    expect(video.src).toBe('http://s/vod.mp4');
    expect(transport.kind).toBe('native');
    expect(l.calls).toEqual([
      ['tracks', expect.objectContaining({ videos: [], audios: [], texts: [] })],
      ['details', { width: 0, height: 0 }],
    ]);
  });

  it('seeks to the start position once metadata is known, and stop clears the source', async () => {
    const transport = new NativeTransport();
    const load = vi.spyOn(video, 'load');
    await transport.load(video, 'http://s/vod.mp4', { live: false, startPositionMs: 90_000 }, listener());
    fire(video, 'loadedmetadata');
    expect(video.currentTime).toBe(90);
    transport.stop();
    expect(video.hasAttribute('src')).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
    transport.stop();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a stop before metadata cancels the pending seek; selections are inert', async () => {
    const transport = new NativeTransport();
    await transport.load(video, 'http://s/vod.mp4', { live: false, startPositionMs: 90_000 }, listener());
    transport.stop();
    fire(video, 'loadedmetadata');
    expect(video.currentTime).toBe(0);
    transport.selectVideo();
    transport.selectAudio();
    transport.selectText();
    expect(transport.tracks.videos).toEqual([]);
  });
});
