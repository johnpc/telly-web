import { describe, expect, it } from 'vitest';
import { DEFAULT_TARGET_DURATION_MS, bestVariant, parseHlsPlaylist, resolveHlsUrl } from './hlsPlaylist';

const BASE = 'http://x/streams/hls-live.m3u8';

describe('parseHlsPlaylist', () => {
  it('reads a master playlist into variants and picks the highest bandwidth', () => {
    const text = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=640000,RESOLUTION=640x360',
      'low/media.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720',
      'http://cdn/high.m3u8',
      '#EXT-X-STREAM-INF:RESOLUTION=1x1',
      'nobw.m3u8',
    ].join('\n');
    const playlist = parseHlsPlaylist(text, BASE);
    expect(playlist.kind).toBe('master');
    if (playlist.kind !== 'master') return;
    expect(playlist.variants).toEqual([
      { url: 'http://x/streams/low/media.m3u8', bandwidth: 640000 },
      { url: 'http://cdn/high.m3u8', bandwidth: 1280000 },
      { url: 'http://x/streams/nobw.m3u8', bandwidth: 0 },
    ]);
    expect(bestVariant(playlist)?.url).toBe('http://cdn/high.m3u8');
    expect(bestVariant({ kind: 'master', variants: [] })).toBeNull();
  });

  it('reads a live media playlist with sequence numbers and target duration', () => {
    const text =
      '#EXTM3U\r\n#EXT-X-TARGETDURATION:2\r\n#EXT-X-MEDIA-SEQUENCE:7\r\n#EXTINF:2.0,\r\nseg7.ts\r\n#EXTINF:2.0,\r\nseg8.ts\r\n';
    const playlist = parseHlsPlaylist(text, BASE);
    expect(playlist).toEqual({
      kind: 'media',
      segments: [
        { sequence: 7, url: 'http://x/streams/seg7.ts' },
        { sequence: 8, url: 'http://x/streams/seg8.ts' },
      ],
      targetDurationMs: 2000,
      ended: false,
      initSegmentUrl: null,
    });
  });

  it('detects ENDLIST, the fMP4 init segment and falls back on a missing target duration', () => {
    const text = ['#EXTM3U', '#EXT-X-MAP:URI="init.mp4"', '#EXTINF:4,', 'a.m4s', '#EXT-X-ENDLIST'].join('\n');
    const playlist = parseHlsPlaylist(text, BASE);
    if (playlist.kind !== 'media') throw new Error('expected media');
    expect(playlist.ended).toBe(true);
    expect(playlist.initSegmentUrl).toBe('http://x/streams/init.mp4');
    expect(playlist.targetDurationMs).toBe(DEFAULT_TARGET_DURATION_MS);
    expect(playlist.segments).toEqual([{ sequence: 0, url: 'http://x/streams/a.m4s' }]);
  });

  it('keeps an unresolvable reference as-is', () => {
    expect(resolveHlsUrl('not a url', 'also not')).toBe('also not');
    expect(resolveHlsUrl(BASE, '/abs/x.ts')).toBe('http://x/abs/x.ts');
  });
});
