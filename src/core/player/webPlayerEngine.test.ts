import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STALLED } from './engineReconnector';
import { PlaybackTelemetry } from './playbackTelemetry';
import { ReconnectPolicy } from './reconnectPolicy';
import type { Ticker } from './stallWatchdog';
import { defineReadOnly, fakeTimeRanges, fire, stubMediaPlayback } from './testSupport';
import { NO_TRACKS, type TrackSnapshot } from './trackModels';
import type { Transport, TransportListener } from './transport';
import { createVideoElement } from './videoElement';
import { WebPlayerEngine } from './webPlayerEngine';

class FakeTransport implements Transport {
  readonly kind = 'mpegts';
  tracks: TrackSnapshot = NO_TRACKS;
  loads: string[] = [];
  stops = 0;
  listener: TransportListener | null = null;
  selected: unknown[] = [];
  load(_video: HTMLVideoElement, url: string, _o: unknown, listener: TransportListener): Promise<void> {
    this.loads.push(url);
    this.listener = listener;
    return Promise.resolve();
  }
  stop(): void {
    this.stops += 1;
  }
  selectVideo(id: string | null): void {
    this.selected.push(['video', id]);
  }
  selectAudio(id: string): void {
    this.selected.push(['audio', id]);
  }
  selectText(id: string | null): void {
    this.selected.push(['text', id]);
  }
}

describe('WebPlayerEngine', () => {
  let transport: FakeTransport;
  let scheduled: { delayMs: number; task: () => void }[];
  let ticks: (() => void)[];
  let lines: string[];
  let video: HTMLVideoElement;
  let engine: WebPlayerEngine;
  let changes: number;

  const ticker: Ticker = (_ms, tick) => {
    ticks.push(tick);
    return () => {
      ticks = ticks.filter((t) => t !== tick);
    };
  };

  beforeEach(() => {
    stubMediaPlayback();
    transport = new FakeTransport();
    scheduled = [];
    ticks = [];
    lines = [];
    changes = 0;
    video = createVideoElement();
    engine = new WebPlayerEngine({
      transportFor: () => Promise.resolve(transport),
      schedule: (delayMs, task) => scheduled.push({ delayMs, task }),
      ticker,
      telemetry: new PlaybackTelemetry(
        () => 0,
        (line) => lines.push(line),
      ),
      policy: new ReconnectPolicy({ maxAttempts: 2 }),
    });
    engine.attach(video);
    engine.subscribe(() => {
      changes += 1;
    });
  });

  const loaded = (): Promise<void> => vi.waitFor(() => expect(transport.loads.length).toBeGreaterThan(0));

  it('load → Buffering, tunes the transport, plays, and READY → Playing (data-state follows)', async () => {
    const play = vi.spyOn(video, 'play');
    engine.load('http://s/1.ts', { live: true });
    expect(engine.state.kind).toBe('Buffering');
    expect(video.dataset.state).toBe('Buffering');
    await loaded();
    expect(play).toHaveBeenCalledTimes(1);
    fire(video, 'playing');
    expect(engine.state.kind).toBe('Playing');
    expect(video.dataset.state).toBe('Playing');
    expect(lines[0]).toBe('tune s/…/1.ts');
  });

  it('skips a re-load of the stream already playing (guide ↔ fullscreen hand-over)', async () => {
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    fire(video, 'playing');
    engine.load('http://s/1.ts', { live: true });
    engine.load('http://s/2.ts', { live: true });
    await vi.waitFor(() => expect(transport.loads).toEqual(['http://s/1.ts', 'http://s/2.ts']));
    expect(transport.stops).toBe(1);
  });

  it('maps element events: waiting → Buffering, ended → Ended', async () => {
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    fire(video, 'playing');
    fire(video, 'waiting');
    expect(engine.state.kind).toBe('Buffering');
    fire(video, 'ended');
    expect(engine.state.kind).toBe('Ended');
  });

  it('an error arms a backoff retry that re-tunes the same stream on the same budget', async () => {
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    transport.listener?.onError('NetworkError/Exception');
    expect(engine.state).toEqual({ kind: 'Reconnecting', attempt: 1, epoch: 1 });
    expect(scheduled.map((s) => s.delayMs)).toEqual([1_000]);
    expect(lines).toContain('load error: NetworkError/Exception');
    scheduled[0]?.task();
    await vi.waitFor(() => expect(transport.loads).toEqual(['http://s/1.ts', 'http://s/1.ts']));
    fire(video, 'playing');
    expect(engine.state.kind).toBe('Playing');
  });

  it('a zap during a reconnect retires the armed retry; the budget spends to Error', async () => {
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    fire(video, 'error');
    engine.load('http://s/2.ts', { live: true });
    await vi.waitFor(() => expect(transport.loads).toEqual(['http://s/1.ts', 'http://s/2.ts']));
    scheduled[0]?.task();
    await Promise.resolve();
    expect(transport.loads).toHaveLength(2);

    transport.listener?.onError('a');
    transport.listener?.onError('b');
    transport.listener?.onError('MEDIA_ERR_DECODE');
    expect(engine.state).toEqual({ kind: 'Error', message: 'MEDIA_ERR_DECODE' });
  });

  it('a transport that cannot be built fails onto the reconnect budget', async () => {
    const broken = new WebPlayerEngine({
      transportFor: () => Promise.reject(new Error('no MSE')),
      schedule: (delayMs, task) => scheduled.push({ delayMs, task }),
      ticker: null,
      telemetry: null,
    });
    broken.attach(createVideoElement());
    broken.load('http://s/1.ts', { live: true });
    await vi.waitFor(() => expect(broken.state.kind).toBe('Reconnecting'));
  });

  it('stop → Idle, transport stopped, retry retired; release removes the video and the watchdog', async () => {
    const host = document.createElement('div');
    engine.moveVideoTo(host);
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    transport.listener?.onError('drop');
    engine.stop();
    expect(engine.state.kind).toBe('Idle');
    expect(transport.stops).toBe(1);
    scheduled[0]?.task();
    await Promise.resolve();
    expect(transport.loads).toHaveLength(1);

    expect(ticks).toHaveLength(1);
    engine.release();
    expect(ticks).toHaveLength(0);
    expect(engine.video).toBeNull();
    expect(host.children).toHaveLength(0);
  });

  it('the watchdog recovers a silently frozen stream through the reconnect budget', async () => {
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    fire(video, 'playing');
    defineReadOnly(video, 'paused', false);
    video.currentTime = 5;
    for (let i = 0; i < 5; i += 1) ticks[0]?.();
    expect(engine.state.kind).toBe('Playing');
    ticks[0]?.();
    // READY bumped the epoch to 2; the stall arms a retry under it.
    expect(engine.state).toEqual({ kind: 'Reconnecting', attempt: 1, epoch: 2 });

    scheduled[0]?.task();
    await vi.waitFor(() => expect(transport.loads).toHaveLength(2));
    fire(video, 'waiting');
    for (let i = 0; i < 15; i += 1) ticks[0]?.();
    expect(engine.state).toEqual({ kind: 'Reconnecting', attempt: 2, epoch: 2 });
    scheduled[1]?.task();
    await vi.waitFor(() => expect(transport.loads).toHaveLength(3));
    fire(video, 'waiting');
    for (let i = 0; i < 15; i += 1) ticks[0]?.();
    expect(engine.state).toEqual({ kind: 'Error', message: STALLED });
  });

  it('pause/play toggle the paused flag and notify; load resets it', async () => {
    const pause = vi.spyOn(video, 'pause');
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    const before = changes;
    engine.pause();
    expect(engine.paused).toBe(true);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(changes).toBe(before + 1);
    engine.play();
    expect(engine.paused).toBe(false);
    engine.pause();
    engine.load('http://s/1.ts', { live: true });
    expect(engine.paused).toBe(false);
    await vi.waitFor(() => expect(transport.loads).toHaveLength(2));
  });

  it('tracks come from the transport and picks are delegated to it', async () => {
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    const snapshot: TrackSnapshot = {
      ...NO_TRACKS,
      audios: [{ id: 'audio:0', language: 'en', channels: 2 }],
    };
    const before = changes;
    transport.listener?.onTracksChanged(snapshot);
    expect(engine.tracks).toBe(snapshot);
    expect(changes).toBe(before + 1);
    engine.selectVideoTrack('level:1');
    engine.selectAudioTrack('audio:0');
    engine.selectTextTrack(null);
    expect(transport.selected).toEqual([
      ['video', 'level:1'],
      ['audio', 'audio:0'],
      ['text', null],
    ]);
    engine.stop();
    expect(engine.tracks).toEqual(NO_TRACKS);
  });

  it('stream details merge element size at READY with transport facts', async () => {
    defineReadOnly(video, 'videoWidth', 1280);
    defineReadOnly(video, 'videoHeight', 720);
    engine.load('http://s/1.ts', { live: true });
    await loaded();
    transport.listener?.onDetails({ frameRate: 25, audioChannels: 1 });
    fire(video, 'playing');
    expect(engine.streamDetails()).toEqual({ width: 1280, height: 720, frameRate: 25, audioChannels: 1 });
  });

  it('element-level controls: seek, position, duration, buffered, volume, mute, resize, audio sync', () => {
    engine.seekTo(2_500);
    expect(engine.positionMs).toBe(2_500);
    expect(engine.durationMs).toBe(0);
    defineReadOnly(video, 'buffered', fakeTimeRanges([[0, 4]]));
    expect(engine.buffered).toEqual([{ startMs: 0, endMs: 4_000 }]);
    engine.volume = 0.5;
    expect(video.volume).toBe(0.5);
    engine.volume = 7;
    expect(engine.volume).toBe(1);
    engine.muted = true;
    expect(video.muted).toBe(true);
    expect(engine.muted).toBe(true);
    engine.resizeMode = 'Zoom';
    expect(video.style.objectFit).toBe('cover');
    expect(engine.resizeMode).toBe('Zoom');
    expect(engine.audioSyncSupport).toBe('unsupported');
    engine.audioSyncMs = 200;
    expect(engine.audioSyncMs).toBe(0);
  });

  it('a detached engine is inert and keeps its settings for the next attach', () => {
    const bare = new WebPlayerEngine({
      transportFor: () => Promise.resolve(transport),
      ticker: null,
      telemetry: null,
    });
    bare.volume = 0.25;
    bare.muted = true;
    bare.resizeMode = 'Fill';
    bare.seekTo(1_000);
    bare.play();
    bare.pause();
    bare.load('http://s/1.ts', { live: true });
    expect(bare.positionMs).toBe(0);
    expect(bare.durationMs).toBe(0);
    expect(bare.buffered).toEqual([]);
    expect(bare.audioSyncSupport).toBe('unsupported');
    const v = createVideoElement();
    bare.attach(v);
    expect(v.volume).toBe(0.25);
    expect(v.muted).toBe(true);
    expect(v.style.objectFit).toBe('fill');
    bare.release();
  });
});
