import { describe, expect, it } from 'vitest';
import { channel, program, UTC } from '@/features/playback/fixtures.test';
import { historyRows, programmeSpan, recentChannels } from './historyRows';

const T = Date.UTC(2026, 8, 13, 14, 45);
const events = [
  { channelKey: 'c3', watchedAtMs: T + 2000 },
  { channelKey: 'c2', watchedAtMs: T + 1000 },
  { channelKey: 'gone', watchedAtMs: T + 500 },
  { channelKey: 'c1', watchedAtMs: T },
];
const channels = [channel(1), channel(2), channel(3, { customName: 'Three' })];

describe('historyRows', () => {
  it('resolves recent channels newest-first by identity, minus the playing one', () => {
    expect(recentChannels(events, channels, 3).map((c) => c.id)).toEqual([2, 1]);
    expect(recentChannels(events, channels, null).map((c) => c.id)).toEqual([3, 2, 1]);
  });

  it('builds History rows with the programme airing at the watch time', () => {
    const programs = [
      program('c1', T - 60_000, T + 60_000, 'Then'),
      program('c3', T + 5000, T + 9000, 'Later'),
    ];
    const rows = historyRows(events, channels, programs, UTC);
    expect(rows.map((r) => [r.name, r.programmeTitle, r.watchedText])).toEqual([
      ['Three', null, 'Sun, Sep 13, 2:45 PM'],
      ['Channel 2', null, 'Sun, Sep 13, 2:45 PM'],
      ['Channel 1', 'Then', 'Sun, Sep 13, 2:45 PM'],
    ]);
    expect(programmeSpan(events)).toEqual({ fromMs: T, toMs: T + 2001 });
    expect(programmeSpan([])).toEqual({ fromMs: 0, toMs: 1 });
  });
});
