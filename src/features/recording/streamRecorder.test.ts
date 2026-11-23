import { describe, expect, it, vi } from 'vitest';
import { bytes, streamResponse } from './recordingTestSupport';
import { FALLBACK_DURATION_MS, isHls, newHlsProgress, recordStream } from './streamRecorder';

describe('streamRecorder routing', () => {
  it('recognizes .m3u8 playlists regardless of query and case', () => {
    expect(isHls('http://x/live.m3u8')).toBe(true);
    expect(isHls('http://x/LIVE.M3U8?token=1#frag')).toBe(true);
    expect(isHls('http://x/news.ts')).toBe(false);
    expect(isHls('http://x/stream?x=.m3u8')).toBe(false);
    expect(FALLBACK_DURATION_MS).toBe(3 * 60 * 60_000);
    expect(newHlsProgress()).toEqual({ lastSequence: -1, initWritten: false });
  });

  it('byte-copies plain streams and segment-appends HLS playlists', async () => {
    const chunks: Uint8Array[] = [];
    const sink = {
      write: (chunk: Uint8Array) => {
        chunks.push(chunk);
        return Promise.resolve();
      },
    };
    const fetch = vi.fn((url: string) => {
      if (url.endsWith('.m3u8'))
        return Promise.resolve(new Response('#EXTM3U\n#EXTINF:2,\nseg.ts\n#EXT-X-ENDLIST\n'));
      return Promise.resolve(streamResponse([bytes(url.endsWith('seg.ts') ? 2 : 1)]));
    });
    const ctx = {
      fetch,
      signal: new AbortController().signal,
      shouldStop: () => false,
      delay: () => Promise.resolve(),
    };
    expect(await recordStream('http://x/news.ts', sink, ctx, newHlsProgress())).toBe(1);
    expect(await recordStream('http://x/live.m3u8', sink, ctx, newHlsProgress())).toBe(1);
    expect(chunks).toEqual([bytes(1), bytes(2)]);
  });
});
