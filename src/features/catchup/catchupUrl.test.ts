import { describe, expect, it } from 'vitest';
import { catchupAttributes, catchupTypeOf, rewritesLiveUrl } from './catchupAttributes';
import { buildCatchupUrl, expandTemplate, flussonicUrl, shiftUrl, xtreamUrl } from './catchupUrl';

const start = 1_700_000_000_000;
const end = start + 90 * 60_000;
const now = start + 3 * 3_600_000;

describe('catchupAttributes', () => {
  it('resolves the type, implying default from a bare source', () => {
    expect(catchupTypeOf(' Shift ')).toBe('shift');
    expect(catchupTypeOf('weird')).toBeNull();
    expect(rewritesLiveUrl('xc')).toBe(true);
    expect(rewritesLiveUrl('append')).toBe(false);
    expect(catchupAttributes({ catchupType: null, catchupSource: 'tpl', catchupDays: null })).toEqual({
      type: 'default',
      source: 'tpl',
      days: 7,
    });
    expect(catchupAttributes({ catchupType: 'append', catchupSource: '  ', catchupDays: 3 })).toBeNull();
    expect(catchupAttributes({ catchupType: 'shift', catchupSource: null, catchupDays: 3 })).toEqual({
      type: 'shift',
      source: null,
      days: 3,
    });
    expect(catchupAttributes({ catchupType: null, catchupSource: null, catchupDays: null })).toBeNull();
  });
});

describe('catchupUrl builders', () => {
  it('expands both placeholder spellings in seconds', () => {
    expect(
      expandTemplate(
        'u={utc}&s=${start}&l={lutc}&n={now}&t={timestamp}&o={offset}&d={duration}',
        start,
        end,
        now,
      ),
    ).toBe(
      `u=${start / 1000}&s=${start / 1000}&l=${now / 1000}&n=${now / 1000}&t=${now / 1000}&o=10800&d=5400`,
    );
  });
  it('builds shift, flussonic and xc URLs', () => {
    expect(shiftUrl('http://h/s', start, now)).toBe(`http://h/s?utc=${start / 1000}&lutc=${now / 1000}`);
    expect(shiftUrl('http://h/s?a=1', start, now)).toContain('?a=1&utc=');
    expect(flussonicUrl('http://h/ch/mono.m3u8?t=1', start, end)).toBe(
      `http://h/ch/archive-${start / 1000}-5400.m3u8?t=1`,
    );
    expect(flussonicUrl('http://h/ch/video.m3u8', start, end)).toBe(
      `http://h/ch/video-${start / 1000}-5400.m3u8`,
    );
    expect(flussonicUrl('http://h/ch/mpegts', start, end)).toBe(
      `http://h/ch/archive-${start / 1000}-5400.ts`,
    );
    expect(xtreamUrl('http://h:80/live/user/pass/42.ts?x=1', start, end)).toBe(
      'http://h:80/timeshift/user/pass/90/2023-11-14:22-13/42.ts',
    );
    expect(xtreamUrl('http://h/odd', start, end)).toBeNull();
  });
  it('dispatches on the attribute type', () => {
    expect(
      buildCatchupUrl('http://h/s', { type: 'default', source: '{utc}', days: 1 }, start, end, now),
    ).toBe(String(start / 1000));
    expect(
      buildCatchupUrl('http://h/s', { type: 'default', source: null, days: 1 }, start, end, now),
    ).toBeNull();
    expect(
      buildCatchupUrl('http://h/s', { type: 'append', source: '?u={utc}', days: 1 }, start, end, now),
    ).toBe(`http://h/s?u=${start / 1000}`);
    expect(
      buildCatchupUrl('http://h/s', { type: 'append', source: null, days: 1 }, start, end, now),
    ).toBeNull();
    expect(
      buildCatchupUrl('http://h/s', { type: 'shift', source: null, days: 1 }, start, end, now),
    ).toContain('utc=');
    expect(
      buildCatchupUrl('http://h/c/mono.m3u8', { type: 'flussonic', source: null, days: 1 }, start, end, now),
    ).toContain('archive-');
    expect(
      buildCatchupUrl('http://h/u/p/1', { type: 'xc', source: null, days: 1 }, start, end, now),
    ).toContain('/timeshift/');
  });
});
