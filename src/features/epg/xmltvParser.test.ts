import { gzipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { FIXTURE_ANCHOR_MS, fixture, fixtureText } from '@/test/fixtureSite';
import { episodeDisplay } from './xmltvEpisodeNum';
import { decodeXmltvBytes, parseXmltv, parseXmltvBytes } from './xmltvParser';
import { parseXmltvMs } from './xmltvTimestamp';

describe('parseXmltvMs', () => {
  it('parses the XMLTV form with and without offsets', () => {
    expect(parseXmltvMs('20261122180000 +0000')).toBe(Date.UTC(2026, 10, 22, 18, 0, 0));
    expect(parseXmltvMs('20261122180000+0100')).toBe(Date.UTC(2026, 10, 22, 17, 0, 0));
    expect(parseXmltvMs(' 20261122180000 -0530 ')).toBe(Date.UTC(2026, 10, 22, 23, 30, 0));
    expect(parseXmltvMs('20261122180000')).toBe(Date.UTC(2026, 10, 22, 18, 0, 0));
    expect(parseXmltvMs('202611221800')).toBeNull();
    expect(parseXmltvMs(null)).toBeNull();
    expect(parseXmltvMs(undefined)).toBeNull();
  });
});

describe('episodeDisplay', () => {
  it('renders xmltv_ns zero-based numbers as S/E and passes other systems through', () => {
    expect(episodeDisplay('xmltv_ns', '0.9.')).toBe('S1 E10');
    expect(episodeDisplay(' xmltv_ns ', ' 2 . 3/20 . 0/2 ')).toBe('S3 E4');
    expect(episodeDisplay('xmltv_ns', '.5.')).toBe('E6');
    expect(episodeDisplay('xmltv_ns', '1')).toBe('S2');
    expect(episodeDisplay('xmltv_ns', '-1.x.')).toBeNull();
    expect(episodeDisplay('onscreen', 'S01E02')).toBe('S01E02');
    expect(episodeDisplay(null, '  ')).toBeNull();
    expect(episodeDisplay(undefined, undefined)).toBeNull();
  });
});

describe('parseXmltv', () => {
  it('parses the fixture guide: 31 channels, 937 programmes, titles/sub-titles/desc/category/episode', () => {
    const doc = parseXmltv(fixtureText('epg.xml'));
    expect(doc.channels).toHaveLength(31);
    expect(doc.channels[0]).toEqual({
      id: 'news-one-1.fixture',
      displayName: 'News One',
      iconUrl: 'http://127.0.0.1:8090/logos/news-one.png',
    });
    expect(doc.programs).toHaveLength(931);
    const withEpisode = doc.programs.find((p) => p.details.episode !== null);
    expect(withEpisode?.details).toMatchObject({
      title: 'Weather Watch',
      subTitle: 'Episode 2',
      category: 'News',
      episode: 'S1 E2',
    });
    expect(withEpisode?.details.description).toContain('in-depth');
    const first = doc.programs[0];
    expect(first).toMatchObject({
      channelId: 'news-one-1.fixture',
      startMs: FIXTURE_ANCHOR_MS - 6 * 3600e3,
      endMs: FIXTURE_ANCHOR_MS - 6 * 3600e3 + 75 * 60e3,
    });
  });

  it('gunzips epg.xml.gz to the same document and passes plain bytes through', () => {
    const fromGz = parseXmltvBytes(fixture('epg.xml.gz'));
    const plain = parseXmltvBytes(fixture('epg.xml'));
    expect(fromGz.programs.length).toBe(plain.programs.length);
    expect(fromGz.channels).toEqual(plain.channels);
    expect(decodeXmltvBytes(gzipSync(strToU8('<tv/>')))).toBe('<tv/>');
    expect(decodeXmltvBytes(strToU8('<tv/>'))).toBe('<tv/>');
    expect(parseXmltvBytes(strToU8('<tv/>'))).toEqual({ channels: [], programs: [] });
  });

  it('skips unusable channels/programmes, keeps first children, reads icons and non-ns episodes', () => {
    const xml = `<?xml version="1.0"?><tv>
      <channel><display-name>No id</display-name></channel>
      <channel id=" "><display-name>Blank id</display-name></channel>
      <channel id="c1"><display-name>First</display-name><display-name>Second</display-name><icon src="i.png"/><other/></channel>
      <channel id="c2"/>
      <programme start="20260101000000 +0000" stop="20260101010000 +0000" channel="c1">
        <title>Real</title><title>Second</title><sub-title>Sub</sub-title>
        <episode-num system="xmltv_ns"></episode-num><episode-num system="onscreen">E7</episode-num>
        <desc>D</desc><desc>ignored</desc><category>Cat</category><credits><actor>x</actor></credits>
      </programme>
      <programme start="20260101000000 +0000" stop="20260101010000 +0000" channel="c1"><title> </title><title>Late</title></programme>
      <programme start="bad" stop="20260101010000 +0000" channel="c1"><title>T</title></programme>
      <programme start="20260101000000 +0000" stop="x" channel="c1"><title>T</title></programme>
      <programme start="20260101000000 +0000" stop="20260101010000 +0000"><title>T</title></programme>
      <programme start="20260101000000 +0000" stop="20260101010000 +0000" channel="c1"></programme>
      <programme start="20260101020000 +0000" stop="20260101030000 +0000" channel="c2"><title>Bare</title></programme>
    </tv>`;
    const doc = parseXmltv(xml);
    expect(doc.channels).toEqual([
      { id: 'c1', displayName: 'First', iconUrl: 'i.png' },
      { id: 'c2', displayName: null, iconUrl: null },
    ]);
    expect(doc.programs).toHaveLength(2);
    expect(doc.programs[0]?.details).toEqual({
      title: 'Real',
      subTitle: 'Sub',
      description: 'D',
      category: 'Cat',
      episode: 'E7',
    });
    expect(doc.programs[1]?.details).toEqual({
      title: 'Bare',
      subTitle: null,
      description: null,
      category: null,
      episode: null,
    });
  });

  it('throws on malformed XML', () => {
    expect(() => parseXmltv('<tv><programme>')).toThrow('malformed');
  });
});
