import { describe, expect, it } from 'vitest';
import type Mpegts from 'mpegts.js';
import { detailsOf, isLivePipe, mpegtsConfig, mpegtsErrorMessage } from './mpegtsConfig';
import { UNKNOWN_PROBE } from '../probe/urlProbe';

describe('mpegts configuration', () => {
  it('a live channel served as a finite file (Content-Length) is NOT a live pipe', () => {
    expect(isLivePipe({ live: true }, { ok: true, contentType: 'video/mp2t', contentLength: 1000 })).toBe(
      false,
    );
    expect(isLivePipe({ live: true }, { ok: true, contentType: 'video/mp2t', contentLength: null })).toBe(
      true,
    );
    expect(isLivePipe({ live: true }, UNKNOWN_PROBE)).toBe(true);
    expect(isLivePipe({ live: false }, UNKNOWN_PROBE)).toBe(false);
  });

  it('builds the worker + no-lazy-load config, chasing latency only when live', () => {
    expect(mpegtsConfig(false)).toMatchObject({
      enableWorker: true,
      lazyLoad: false,
      isLive: false,
      liveBufferLatencyChasing: false,
    });
    expect(mpegtsConfig(true)).toMatchObject({ isLive: true, liveBufferLatencyChasing: false });
  });

  it('maps MEDIA_INFO onto badge facts, tolerating missing fields', () => {
    const info = {
      mimeType: 'video/mp2t',
      width: 1280,
      height: 720,
      fps: 25,
      audioChannelCount: 1,
    } as Mpegts.MSEPlayerMediaInfo;
    expect(detailsOf(info)).toEqual({ width: 1280, height: 720, frameRate: 25, audioChannels: 1 });
    expect(detailsOf({ mimeType: 'video/mp2t' } as Mpegts.MSEPlayerMediaInfo)).toEqual({
      width: 0,
      height: 0,
      frameRate: 0,
      audioChannels: 0,
    });
  });

  it('formats the three-argument error', () => {
    expect(mpegtsErrorMessage('NetworkError', 'HttpStatusCodeInvalid', { msg: '404' })).toBe(
      'NetworkError/HttpStatusCodeInvalid: 404',
    );
    expect(mpegtsErrorMessage('MediaError', 'MediaMSEError')).toBe('MediaError/MediaMSEError');
  });
});
