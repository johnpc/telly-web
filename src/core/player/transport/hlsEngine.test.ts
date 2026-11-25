import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HlsTransport, hlsConfig, hlsErrorMessage, type HlsCtor } from './hlsEngine';
import { RunwayStore } from '../gate/runwayProgress';
import { defineReadOnly, fakeTimeRanges, fire, stubMediaPlayback } from '../testSupport';
import type { TransportListener } from './transport';

const fake = vi.hoisted(() => {
  class FakeHls {
    static Events = {
      MANIFEST_PARSED: 'mp',
      LEVEL_SWITCHED: 'ls',
      AUDIO_TRACKS_UPDATED: 'atu',
      AUDIO_TRACK_SWITCHED: 'ats',
      SUBTITLE_TRACKS_UPDATED: 'stu',
      SUBTITLE_TRACK_SWITCH: 'sts',
      ERROR: 'err',
    };
    static instances: FakeHls[] = [];
    static isSupported = (): boolean => true;
    handlers = new Map<string, (event: string, data: unknown) => void>();
    levels = [{ width: 1280, height: 720, bitrate: 2_000_000, frameRate: 25 }];
    currentLevel = 0;
    autoLevelEnabled = true;
    audioTracks = [{ id: 0, lang: 'en', channels: '2' }];
    audioTrack = 0;
    subtitleTracks = [{ id: 0, lang: 'en' }];
    subtitleTrack = -1;
    subtitleDisplay = true;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    detachMedia = vi.fn();
    stopLoad = vi.fn();
    destroy = vi.fn();
    constructor(public config: unknown) {
      FakeHls.instances.push(this);
    }
    on(event: string, handler: (event: string, data: unknown) => void): void {
      this.handlers.set(event, handler);
    }
    emit(event: string, data: unknown = {}): void {
      this.handlers.get(event)?.(event, data);
    }
  }
  return { FakeHls };
});

vi.mock('hls.js', () => ({ default: fake.FakeHls }));

function listener(): TransportListener & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    onTracksChanged: (s) => calls.push(['tracks', s]),
    onDetails: (d) => calls.push(['details', d]),
    onError: (m) => calls.push(['error', m]),
  };
}

describe('HlsTransport', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    stubMediaPlayback();
    fake.FakeHls.instances.length = 0;
    video = document.createElement('video');
  });

  it('gates the element like every transport: held until the runway, hls.js keeps buffering meanwhile', async () => {
    const transport = new HlsTransport();
    const runway = new RunwayStore();
    const play = vi.spyOn(video, 'play');
    const pause = vi.spyOn(video, 'pause');
    defineReadOnly(video, 'paused', false);
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 1]]));
    await transport.load(
      video,
      'http://s/live.m3u8',
      { live: true, buffer: { runwaySec: 6 }, runway },
      listener(),
    );
    expect(fake.FakeHls.instances[0]?.stopLoad).not.toHaveBeenCalled();
    fire(video, 'play');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(runway.get()).toEqual({ ahead: 1, need: 6 });
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 7]]));
    fire(video, 'progress');
    expect(play).toHaveBeenCalledTimes(1);
    expect(fake.FakeHls.instances[0]?.stopLoad).not.toHaveBeenCalled();
    transport.stop();
    expect(runway.get()).toEqual({ ahead: 0, need: 0 });
    fire(video, 'waiting');
    fire(video, 'progress');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('a live playlist buffered to its edge plays below the runway (never waits past what the edge gives)', async () => {
    const transport = new HlsTransport();
    const play = vi.spyOn(video, 'play');
    defineReadOnly(video, 'paused', false);
    defineReadOnly(video, 'duration', 18);
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 17.9]]));
    video.currentTime = 15;
    await transport.load(video, 'http://s/live.m3u8', { live: true, buffer: { runwaySec: 6 } }, listener());
    fire(video, 'play');
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('builds hls.js lazily with low-latency off, captions off, and attaches', async () => {
    const transport = new HlsTransport();
    await transport.load(video, 'http://s/live.m3u8', { live: true, startPositionMs: 2_000 }, listener());
    const hls = fake.FakeHls.instances[0];
    expect(hls?.config).toEqual({ lowLatencyMode: false, enableWorker: true, startPosition: 2 });
    expect(hls?.subtitleDisplay).toBe(false);
    expect(hls?.loadSource).toHaveBeenCalledWith('http://s/live.m3u8');
    expect(hls?.attachMedia).toHaveBeenCalledWith(video);
    expect(transport.kind).toBe('hls');
    expect(hlsConfig({ live: true }).startPosition).toBe(-1);
  });

  it('every track-shaping event refreshes the snapshot and details', async () => {
    const transport = new HlsTransport();
    const l = listener();
    await transport.load(video, 'http://s/live.m3u8', { live: true }, l);
    const hls = fake.FakeHls.instances[0];
    hls?.emit('mp');
    expect(transport.tracks.videos).toEqual([
      { id: 'level:0', width: 1280, height: 720, bitrate: 2_000_000 },
    ]);
    expect(l.calls).toEqual([
      ['tracks', transport.tracks],
      ['details', { width: 1280, height: 720, frameRate: 25, audioChannels: 2 }],
    ]);
    for (const event of ['ls', 'atu', 'ats', 'stu', 'sts']) hls?.emit(event);
    expect(l.calls).toHaveLength(12);
  });

  it('only fatal errors reach the reconnect budget', async () => {
    const transport = new HlsTransport();
    const l = listener();
    await transport.load(video, 'http://s/live.m3u8', { live: true }, l);
    const hls = fake.FakeHls.instances[0];
    hls?.emit('err', { type: 'networkError', details: 'fragLoadError', fatal: false });
    hls?.emit('err', { type: 'networkError', details: 'manifestLoadError', fatal: true });
    expect(l.calls).toEqual([['error', 'networkError/manifestLoadError']]);
    expect(hlsErrorMessage({ type: 'mediaError', details: 'bufferStalledError' } as never)).toBe(
      'mediaError/bufferStalledError',
    );
  });

  it('applies picks: level override / Auto, audio track, captions on / off', async () => {
    const transport = new HlsTransport();
    await transport.load(video, 'http://s/live.m3u8', { live: true }, listener());
    const hls = fake.FakeHls.instances[0];
    transport.selectVideo('level:0');
    expect(hls?.currentLevel).toBe(0);
    transport.selectVideo(null);
    expect(hls?.currentLevel).toBe(-1);
    transport.selectVideo('audio:0');
    expect(hls?.currentLevel).toBe(-1);
    transport.selectAudio('audio:0');
    expect(hls?.audioTrack).toBe(0);
    transport.selectAudio('bogus');
    transport.selectText('text:0');
    expect(hls?.subtitleTrack).toBe(0);
    expect(hls?.subtitleDisplay).toBe(true);
    transport.selectText(null);
    expect(hls?.subtitleTrack).toBe(-1);
    expect(hls?.subtitleDisplay).toBe(false);
    transport.selectText('level:0');
    expect(hls?.subtitleTrack).toBe(-1);
  });

  it('stop tears down once and clears the snapshot; picks without an instance are inert', async () => {
    const transport = new HlsTransport();
    transport.selectVideo('level:0');
    transport.selectAudio('audio:0');
    transport.selectText(null);
    await transport.load(video, 'http://s/live.m3u8', { live: true }, listener());
    const hls = fake.FakeHls.instances[0];
    hls?.emit('mp');
    transport.stop();
    transport.stop();
    expect(transport.tracks.videos).toEqual([]);
    expect(hls?.stopLoad).toHaveBeenCalledTimes(1);
    expect(hls?.detachMedia).toHaveBeenCalledTimes(1);
    expect(hls?.destroy).toHaveBeenCalledTimes(1);
  });

  it('a stop during the import creates no instance', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = new HlsTransport(async () => {
      await gate;
      return fake.FakeHls as unknown as HlsCtor;
    });
    const loading = transport.load(video, 'http://s/live.m3u8', { live: true }, listener());
    transport.stop();
    release();
    await loading;
    expect(fake.FakeHls.instances).toHaveLength(0);
  });
});
