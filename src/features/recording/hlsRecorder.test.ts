import { describe, expect, it, vi } from 'vitest';
import { captureExtensionOf, recordHls } from './hlsRecorder';
import { bytes } from './recordingTestSupport';
import { type CaptureContext, type CaptureSink, newHlsProgress } from './streamRecorder';

const MASTER = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000\nmedia.m3u8\n';
const media = (sequence: number, ...names: string[]): string =>
  `#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:${sequence}\n${names.map((n) => `#EXTINF:2,\n${n}`).join('\n')}\n`;

function fetchOf(routes: Record<string, string | Uint8Array<ArrayBuffer>>): CaptureContext['fetch'] {
  return vi.fn((url: string) => {
    const hit = routes[url];
    if (hit === undefined) return Promise.resolve(new Response(null, { status: 404 }));
    return Promise.resolve(new Response(hit));
  });
}

function sinkOf(): CaptureSink & { chunks: Uint8Array[] } {
  const chunks: Uint8Array[] = [];
  return {
    chunks,
    write: (chunk) => {
      chunks.push(chunk);
      return Promise.resolve();
    },
  };
}

function ctxOf(fetch: CaptureContext['fetch'], stops: boolean[] = []): CaptureContext & { delays: number[] } {
  const delays: number[] = [];
  return {
    fetch,
    signal: new AbortController().signal,
    shouldStop: () => stops.shift() ?? true,
    delay: (ms) => {
      delays.push(ms);
      return Promise.resolve();
    },
    delays,
  };
}

describe('recordHls', () => {
  it('hops the master onto its variant, appends every segment once and polls per target duration', async () => {
    let poll = 0;
    const playlists = [media(0, 's0.ts', 's1.ts'), media(1, 's1.ts', 's2.ts')];
    const fetch = vi.fn((url: string) => {
      if (url === 'http://x/master.m3u8') return Promise.resolve(new Response(MASTER));
      if (url === 'http://x/media.m3u8') return Promise.resolve(new Response(playlists[poll++] ?? ''));
      return Promise.resolve(new Response(bytes(Number(url.slice(-4, -3)))));
    });
    const sink = sinkOf();
    const ctx = ctxOf(fetch, [false, false, false, false, false, false, true]);
    const written = await recordHls('http://x/master.m3u8', sink, ctx, newHlsProgress());
    expect(sink.chunks).toEqual([bytes(0), bytes(1), bytes(2)]);
    expect(written).toBe(3);
    expect(ctx.delays).toEqual([2000, 2000]);
  });

  it('writes the fMP4 init segment first and finishes on ENDLIST', async () => {
    const text = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2,\na.m4s\n#EXT-X-ENDLIST\n';
    const fetch = fetchOf({
      'http://x/v.m3u8': text,
      'http://x/init.mp4': bytes(9),
      'http://x/a.m4s': bytes(1),
    });
    const sink = sinkOf();
    const progress = newHlsProgress();
    expect(await recordHls('http://x/v.m3u8', sink, ctxOf(fetch, [false, false, false]), progress)).toBe(2);
    expect(sink.chunks).toEqual([bytes(9), bytes(1)]);
    // A reconnect attempt on the same file never rewrites the init segment or a seen sequence.
    expect(await recordHls('http://x/v.m3u8', sink, ctxOf(fetch, [false, false, false]), progress)).toBe(0);
  });

  it('rejects masters without variants, non-media variants and failing fetches', async () => {
    const empty = ctxOf(fetchOf({ 'http://x/m.m3u8': '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n' }), [false]);
    await expect(recordHls('http://x/m.m3u8', sinkOf(), empty, newHlsProgress())).rejects.toThrow(
      'without variants',
    );
    const nested = ctxOf(fetchOf({ 'http://x/m.m3u8': MASTER, 'http://x/media.m3u8': MASTER }), [false]);
    await expect(recordHls('http://x/m.m3u8', sinkOf(), nested, newHlsProgress())).rejects.toThrow(
      'not a media',
    );
    await expect(
      recordHls('http://x/404.m3u8', sinkOf(), ctxOf(fetchOf({})), newHlsProgress()),
    ).rejects.toThrow('HTTP 404');
    const deadSegment = ctxOf(fetchOf({ 'http://x/v.m3u8': media(0, 'gone.ts') }), [false, false]);
    await expect(recordHls('http://x/v.m3u8', sinkOf(), deadSegment, newHlsProgress())).rejects.toThrow(
      'HTTP 404',
    );
  });
});

describe('captureExtensionOf', () => {
  it('names TS-segment HLS and plain streams .ts, fMP4 HLS .mp4, and falls back on probe failures', async () => {
    const fmp4 = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2,\na.m4s\n';
    const fetch = fetchOf({ 'http://x/ts.m3u8': media(0, 'a.ts'), 'http://x/mp4.m3u8': fmp4 });
    expect(await captureExtensionOf('http://x/news.ts', { fetch })).toBe('ts');
    expect(await captureExtensionOf('http://x/ts.m3u8?token=1', { fetch })).toBe('ts');
    expect(await captureExtensionOf('http://x/mp4.m3u8', { fetch })).toBe('mp4');
    expect(await captureExtensionOf('http://x/missing.m3u8', { fetch })).toBe('ts');
  });
});
