import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeTransport } from './nativeEngine';
import { RunwayStore } from '../gate/runwayProgress';
import { defineReadOnly, fakeTimeRanges, fire, stubMediaPlayback } from '../testSupport';
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

  it('gates the element like every transport; a file buffered to its end plays out below the runway', async () => {
    const transport = new NativeTransport();
    const runway = new RunwayStore();
    const play = vi.spyOn(video, 'play');
    const pause = vi.spyOn(video, 'pause');
    defineReadOnly(video, 'paused', false);
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 2]]));
    await transport.load(
      video,
      'http://s/vod.mp4',
      { live: false, buffer: { runwaySec: 6 }, runway },
      listener(),
    );
    fire(video, 'play');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(runway.get()).toEqual({ ahead: 2, need: 6 });
    defineReadOnly(video, 'duration', 4.5);
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 4.4]]));
    fire(video, 'progress');
    expect(play).toHaveBeenCalledTimes(1);
    transport.stop();
    expect(runway.get()).toEqual({ ahead: 0, need: 0 });
    fire(video, 'waiting');
    fire(video, 'progress');
    expect(play).toHaveBeenCalledTimes(1);
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
