import { describe, expect, it } from 'vitest';
import type { M3uChannel } from '@/features/playlist/m3uTypes';
import { groupCount, isHttpUrl, liveCount, movieCount, parseHttpUrl, suggestName } from './playlistSummary';

function channel(streamUrl: string, groupTitle: string | null): M3uChannel {
  return {
    title: streamUrl,
    streamUrl,
    tvgId: null,
    tvgName: null,
    tvgLogo: null,
    groupTitle,
    catchup: null,
    catchupSource: null,
    catchupDays: null,
    tvgChno: null,
    userAgent: null,
  };
}

const channels = [
  channel('http://x/1.ts', 'News'),
  channel('http://x/2.m3u8', 'News'),
  channel('http://x/movie.mp4', 'Movies'),
  channel('http://x/3.ts', '  '),
  channel('http://x/4.ts', null),
];

describe('playlistSummary', () => {
  it('splits movies from live channels like TiviMate', () => {
    expect(movieCount(channels)).toBe(1);
    expect(liveCount(channels)).toBe(4);
  });
  it('counts distinct non-blank groups', () => {
    expect(groupCount(channels)).toBe(2);
  });
  it('suggests the URL host as the playlist name', () => {
    expect(suggestName('http://127.0.0.1:8090/playlist.m3u')).toBe('127.0.0.1');
    expect(suggestName('not a url')).toBe('not a url');
  });
  it('accepts only absolute http(s) URLs with a host', () => {
    expect(isHttpUrl('http://example.com/p.m3u')).toBe(true);
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('ftp://example.com/p.m3u')).toBe(false);
    expect(isHttpUrl('not-a-url')).toBe(false);
    expect(parseHttpUrl('http://')).toBeNull();
  });
});
