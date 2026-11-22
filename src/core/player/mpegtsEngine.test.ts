import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MpegtsTransport, type MpegtsModule } from './mpegtsEngine';
import type { TransportListener } from './transport';
import { UNKNOWN_PROBE } from './urlProbe';

const fake = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const player = {
    currentTime: 0,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => handlers.set(event, handler)),
    attachMediaElement: vi.fn(),
    detachMediaElement: vi.fn(),
    load: vi.fn(),
    unload: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
  };
  const lib = {
    createPlayer: vi.fn(() => player),
    isSupported: () => true,
    Events: { ERROR: 'error', MEDIA_INFO: 'media_info' },
  };
  return { handlers, player, lib };
});

vi.mock('mpegts.js', () => ({ default: fake.lib }));

function listener(): TransportListener & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    onTracksChanged: (s) => calls.push(['tracks', s]),
    onDetails: (d) => calls.push(['details', d]),
    onError: (m) => calls.push(['error', m]),
  };
}

describe('MpegtsTransport', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    fake.handlers.clear();
    fake.player.currentTime = 0;
    video = document.createElement('video');
  });

  it('imports mpegts.js lazily, probes the url and plays a Range-served file as non-live', async () => {
    const transport = new MpegtsTransport(undefined, () =>
      Promise.resolve({ ok: true, contentType: 'video/mp2t', contentLength: 5_000 }),
    );
    const l = listener();
    await transport.load(video, 'http://s/1.ts', { live: true, startPositionMs: 1_500 }, l);

    expect(fake.lib.createPlayer).toHaveBeenCalledWith(
      { type: 'mpegts', url: 'http://s/1.ts', isLive: false, cors: true },
      expect.objectContaining({ isLive: false, enableWorker: true, lazyLoad: false }),
    );
    expect(fake.player.attachMediaElement).toHaveBeenCalledWith(video);
    expect(fake.player.load).toHaveBeenCalledTimes(1);
    expect(fake.player.currentTime).toBe(1.5);
    expect(l.calls).toEqual([['tracks', expect.objectContaining({ videos: [] })]]);
    expect(transport.kind).toBe('mpegts');
    expect(transport.tracks.videos).toEqual([]);
  });

  it('a chunked live pipe gets isLive + latency chasing and ignores the start position', async () => {
    const transport = new MpegtsTransport(undefined, () => Promise.resolve(UNKNOWN_PROBE));
    await transport.load(video, 'http://s/live', { live: true, startPositionMs: 1_500 }, listener());
    expect(fake.lib.createPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ isLive: true }),
      expect.objectContaining({ isLive: true, liveBufferLatencyChasing: true }),
    );
    expect(fake.player.currentTime).toBe(0);
  });

  it('forwards library errors and MEDIA_INFO to the listener', async () => {
    const transport = new MpegtsTransport(undefined, () => Promise.resolve(UNKNOWN_PROBE));
    const l = listener();
    await transport.load(video, 'http://s/live', { live: true }, l);
    fake.handlers.get('media_info')?.({ width: 1280, height: 720, fps: 25, audioChannelCount: 1 });
    fake.handlers.get('error')?.('NetworkError', 'Exception', { msg: 'boom' });
    expect(l.calls.slice(1)).toEqual([
      ['details', { width: 1280, height: 720, frameRate: 25, audioChannels: 1 }],
      ['error', 'NetworkError/Exception: boom'],
    ]);
  });

  it('stop tears the player down once; selections are inert', async () => {
    const transport = new MpegtsTransport(undefined, () => Promise.resolve(UNKNOWN_PROBE));
    await transport.load(video, 'http://s/live', { live: true }, listener());
    transport.selectVideo();
    transport.selectAudio();
    transport.selectText();
    transport.stop();
    transport.stop();
    expect(fake.player.unload).toHaveBeenCalledTimes(1);
    expect(fake.player.detachMediaElement).toHaveBeenCalledTimes(1);
    expect(fake.player.destroy).toHaveBeenCalledTimes(1);
  });

  it('a stop during the import leaves no player behind', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = new MpegtsTransport(
      async () => {
        await gate;
        return fake.lib as unknown as MpegtsModule;
      },
      () => Promise.resolve(UNKNOWN_PROBE),
    );
    const loading = transport.load(video, 'http://s/live', { live: true }, listener());
    transport.stop();
    release();
    await loading;
    expect(fake.lib.createPlayer).not.toHaveBeenCalled();
  });
});
