import { describe, expect, it } from 'vitest';
import { channel, program, UTC } from '../fixtures.test';
import { buildPlaybackInfo, channelLabel, NO_NOW_NEXT } from './playbackInfo';
import { buildRecentCards, recentCardLine } from './recentCards';

const T = Date.UTC(2026, 8, 13, 14, 45);
const now = {
  ...program('c1', T - 15 * 60_000, T + 60 * 60_000, 'Business Hour'),
  subTitle: 'Episode 7',
  episode: 'S1 E7',
  description: 'Desc',
};
const next = program('c1', T + 60 * 60_000, T + 150 * 60_000, 'Newsroom Live');
const details = { width: 1280, height: 720, frameRate: 25, audioChannels: 1 };

describe('buildPlaybackInfo', () => {
  it('pre-formats the overlay model like capture 34', () => {
    const info = buildPlaybackInfo(
      channel(1, { name: 'News One', customName: ' ' }),
      { now, next },
      details,
      T,
      UTC,
    );
    expect(info).toMatchObject({
      channelId: 1,
      number: 1,
      name: 'News One',
      group: 'News',
      clockText: 'Sun, Sep 13, 2:45 PM',
      title: 'Business Hour: Episode 7. S1 E7',
      timeRange: '02:30 — 03:45 PM',
      remaining: '60 min',
      progressPermille: 200,
      description: 'Desc',
      nextLine: '03:45 — 05:15 PM  Newsroom Live',
      badges: ['HD', '25 FPS', 'MONO'],
      elapsed: '15:00',
      duration: '1:15:00',
    });
    expect(channelLabel(info)).toBe('1  News One');
  });

  it('drops everything the EPG and the engine do not know', () => {
    const info = buildPlaybackInfo(
      channel(2, { customName: 'Mine', logoUrl: null, groupTitle: null }),
      NO_NOW_NEXT,
      null,
      T,
      UTC,
    );
    expect(info).toMatchObject({
      name: 'Mine',
      logoUrl: null,
      group: null,
      title: null,
      timeRange: null,
      remaining: null,
      progressPermille: 0,
      description: null,
      nextLine: null,
      badges: [],
      elapsed: null,
      duration: null,
    });
  });
});

describe('recent cards', () => {
  it('pairs recent channels with their current programme and builds the focused line', () => {
    const guide = new Map([['c1', { now, next }]]);
    const cards = buildRecentCards([channel(1), channel(2, { tvgId: null }), channel(3)], guide, UTC);
    expect(cards.map((c) => c.nowTitle)).toEqual(['Business Hour: Episode 7. S1 E7', null, null]);
    expect(recentCardLine(cards[0] ?? null)).toBe('02:30 — 03:45 PM   Business Hour: Episode 7. S1 E7');
    expect(recentCardLine(cards[1] ?? null)).toBeNull();
    expect(recentCardLine(null)).toBeNull();
    const first = cards[0];
    expect(recentCardLine(first === undefined ? null : { ...first, nowRange: null })).toBe(
      'Business Hour: Episode 7. S1 E7',
    );
    expect(buildRecentCards([channel(1)], undefined, UTC)[0]?.nowTitle).toBeNull();
  });
});
