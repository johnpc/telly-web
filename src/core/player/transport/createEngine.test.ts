import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createEngine,
  createSharedEngine,
  createTransport,
  detectCapabilities,
  engineKindForContentType,
  engineKindForUrl,
  extensionOf,
  resolveEngineKind,
  transportFactory,
  type EngineCapabilities,
} from './createEngine';
import { stubMediaPlayback } from '../testSupport';
import { VIDEO_TESTID } from '../video/videoElement';

const mse: EngineCapabilities = { mse: true, nativeHls: false };
const safari: EngineCapabilities = { mse: false, nativeHls: true };

describe('engine choice by url', () => {
  it('reads the extension off the path only', () => {
    expect(extensionOf('http://s/streams/news-one.ts?token=1#x')).toBe('ts');
    expect(extensionOf('http://s/live/HLS.M3U8')).toBe('m3u8');
    expect(extensionOf('http://s/live/12345')).toBe('');
    expect(extensionOf('http://s/live/12345/')).toBe('');
    expect(extensionOf('http://s/.hidden')).toBe('');
  });

  it('.m3u8 → hls.js, or the native element when only Safari HLS is available', () => {
    expect(engineKindForUrl('http://s/a.m3u8', mse)).toBe('hls');
    expect(engineKindForUrl('http://s/a.m3u', mse)).toBe('hls');
    expect(engineKindForUrl('http://s/a.m3u8', safari)).toBe('native');
    expect(engineKindForUrl('http://s/a.m3u8', { mse: true, nativeHls: true })).toBe('hls');
  });

  it('.ts / MPEG-TS → mpegts.js; mp4/mkv/webm/mov → native; odd extensions → mpegts', () => {
    expect(engineKindForUrl('http://s/a.ts', mse)).toBe('mpegts');
    expect(engineKindForUrl('http://s/a.mpg', mse)).toBe('mpegts');
    expect(engineKindForUrl('http://s/mpegts/12345', mse)).toBe('mpegts');
    expect(engineKindForUrl('http://s/a.mp4', mse)).toBe('native');
    expect(engineKindForUrl('http://s/a.mkv', mse)).toBe('native');
    expect(engineKindForUrl('http://s/a.webm', mse)).toBe('native');
    expect(engineKindForUrl('http://s/a.mov', mse)).toBe('native');
    expect(engineKindForUrl('http://s/a.php', mse)).toBe('mpegts');
  });

  it('an extensionless provider url is undecided until sniffed', async () => {
    expect(engineKindForUrl('http://s/live/12345', mse)).toBeNull();
    expect(engineKindForContentType('application/vnd.apple.mpegurl', mse)).toBe('hls');
    expect(engineKindForContentType('application/x-mpegURL', safari)).toBe('native');
    expect(engineKindForContentType('video/mp4', mse)).toBe('native');
    expect(engineKindForContentType('video/mp2t', mse)).toBe('mpegts');
    expect(engineKindForContentType(null, mse)).toBe('mpegts');

    await expect(resolveEngineKind('http://s/a.ts', mse, () => Promise.resolve('video/mp4'))).resolves.toBe(
      'mpegts',
    );
    await expect(resolveEngineKind('http://s/live/1', mse, () => Promise.resolve('video/mp4'))).resolves.toBe(
      'native',
    );
    const factory = transportFactory(mse, () => Promise.resolve('application/vnd.apple.mpegurl'));
    await expect(factory('http://s/live/1')).resolves.toHaveProperty('kind', 'hls');
  });

  it('creates the matching transport per kind', () => {
    expect(createTransport('hls').kind).toBe('hls');
    expect(createTransport('mpegts').kind).toBe('mpegts');
    expect(createTransport('native').kind).toBe('native');
  });
});

describe('capabilities + engine construction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects MSE and native HLS from the runtime', () => {
    expect(detectCapabilities()).toEqual({ mse: false, nativeHls: false });
    vi.stubGlobal('MediaSource', { isTypeSupported: () => true });
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe');
    expect(detectCapabilities()).toEqual({ mse: true, nativeHls: true });
  });

  it('createEngine / createSharedEngine build an engine with its own <video>', () => {
    stubMediaPlayback();
    const engine = createEngine({ ticker: null, telemetry: null });
    expect(engine.state.kind).toBe('Idle');
    const shared = createSharedEngine({ ticker: null, telemetry: null });
    const lease = shared.acquire();
    expect(lease.engine.video?.dataset.testid).toBe(VIDEO_TESTID);
    vi.useFakeTimers();
    lease.release();
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
    expect(lease.engine.video).toBeNull();
  });
});
