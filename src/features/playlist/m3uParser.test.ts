import { describe, expect, it } from 'vitest';
import { fixtureText } from '@/test/fixtureSite';
import { intOrNull, parseAttributes } from './m3uAttributes';
import { headerAttributes, isExtInf, isHeader, parseExtInf, parseM3u } from './m3uParser';

describe('parseExtInf', () => {
  it('reads quoted attributes and the title after the last comma', () => {
    const entry = parseExtInf('#EXTINF:-1 tvg-id="a.b" tvg-name="A, B" group-title="News",News, One ');
    expect(entry).toEqual({
      title: 'One',
      attributes: { 'tvg-id': 'a.b', 'tvg-name': 'A, B', 'group-title': 'News' },
    });
  });

  it('accepts unquoted attributes and later duplicates win', () => {
    expect(parseAttributes('tvg-id=abc tvg-chno=12 tvg-id="x y"')).toEqual({
      'tvg-id': 'x y',
      'tvg-chno': '12',
    });
    expect(parseAttributes('k=')).toEqual({});
    expect(intOrNull(' 7 ')).toBe(7);
    expect(intOrNull('x')).toBeNull();
    expect(intOrNull(undefined)).toBeNull();
  });

  it('rejects non-EXTINF lines and empty titles', () => {
    expect(parseExtInf('http://x')).toBeNull();
    expect(parseExtInf('#EXTINF:-1 tvg-id="a",')).toBeNull();
    expect(parseExtInf('#EXTINF')).toBeNull();
    expect(parseExtInf('#EXTINF:-1')).toBeNull();
    expect(isExtInf('  #EXTINF:0,x')).toBe(true);
    expect(isHeader('#EXTM3U')).toBe(true);
    expect(headerAttributes('#EXTINF:-1,x')).toEqual({});
    expect(headerAttributes('#EXTM3U url-tvg="http://e" x-tvg-url=plain')).toEqual({
      'url-tvg': 'http://e',
      'x-tvg-url': 'plain',
    });
  });
});

describe('parseM3u', () => {
  it('parses the fixture playlist: 31 live channels, 2 VOD, url-tvg, catch-up on News One', () => {
    const playlist = parseM3u(fixtureText('playlist.m3u'));
    expect(playlist.epgUrl).toBe('http://127.0.0.1:8090/epg.xml');
    expect(playlist.channels).toHaveLength(33);
    const [first] = playlist.channels;
    expect(first).toMatchObject({
      title: 'News One',
      tvgId: 'news-one-1.fixture',
      tvgName: 'News One',
      tvgLogo: 'http://127.0.0.1:8090/logos/news-one.png',
      groupTitle: 'News',
      streamUrl: 'http://127.0.0.1:8090/streams/news-one.ts',
      catchup: 'default',
      catchupSource: 'http://127.0.0.1:8090/streams/news-one.ts?utc={utc}&lutc={lutc}&d={duration}',
      catchupDays: 2,
      tvgChno: null,
      userAgent: null,
    });
    expect(playlist.channels[1]).toMatchObject({ catchup: null, catchupSource: null, catchupDays: null });
    expect(new Set(playlist.channels.map((c) => c.groupTitle)).size).toBe(7);
    expect(playlist.channels.at(-1)).toMatchObject({
      title: 'Sintel',
      streamUrl: 'http://127.0.0.1:8090/streams/vod-sample.mp4',
    });
  });

  it('handles EXTGRP, EXTVLCOPT, catchup-type, CRLF, comments and orphan URLs', () => {
    const text = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="a" catchup-type="shift" catchup-days=" 3 ",A',
      '#EXTGRP:Grouped',
      '#EXTVLCOPT:http-user-agent=Telly/1.0',
      'http://s/a.ts',
      '#EXTINF:-1 group-title="Own",B',
      '#EXTGRP:Ignored',
      'http://s/b.ts',
      '# a comment',
      'http://orphan.ts',
      '#EXTINF:-1 tvg-chno="42",C',
      '#EXTGRP:',
      'http://s/c.ts',
      '#EXTINF:-1,Dangling',
    ].join('\r\n');
    const { epgUrl, channels } = parseM3u(text);
    expect(epgUrl).toBeNull();
    expect(
      channels.map((c) => [c.title, c.groupTitle, c.catchup, c.catchupDays, c.userAgent, c.tvgChno]),
    ).toEqual([
      ['A', 'Grouped', 'shift', 3, 'Telly/1.0', null],
      ['B', 'Own', null, null, null, null],
      ['C', null, null, null, null, 42],
    ]);
  });

  it('keeps the first url-tvg when later headers lack one', () => {
    expect(parseM3u('#EXTM3U url-tvg="http://a"\n#EXTM3U\n').epgUrl).toBe('http://a');
    expect(parseM3u('').channels).toEqual([]);
  });
});
