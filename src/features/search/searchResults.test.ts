import { describe, expect, it } from 'vitest';
import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { TWELVE_HOUR } from './programTimes';
import { buildProgramChannels, channelsByEpgId } from './searchPrograms';
import { EMPTY_RESULTS, buildChannelHits, isEmptyResults, programHit } from './searchResults';

const HOUR = 3_600_000;
const NOW = new Date(2026, 8, 13, 14, 0).getTime();

export function channel(
  id: number,
  name: string,
  tvgId: string | null = `${id}.id`,
  extra: Partial<ChannelRow> = {},
): ChannelRow {
  return {
    id,
    name,
    number: id,
    tvgId,
    streamUrl: `http://x/${id}`,
    customName: null,
    epgOverride: null,
    logoUrl: null,
    hidden: false,
    ...extra,
  } as ChannelRow;
}

export function program(
  tvgId: string,
  startMs: number,
  endMs: number,
  title = 'Show',
  extra: Partial<ProgramRow> = {},
): ProgramRow {
  return {
    id: startMs,
    channelTvgId: tvgId,
    startMs,
    endMs,
    title,
    subTitle: null,
    description: null,
    category: null,
    episode: null,
    ...extra,
  };
}

describe('searchResults', () => {
  it('builds channel cards with the airing title and progress, or empty without EPG', () => {
    const now = program('1.id', NOW - HOUR, NOW + HOUR, 'Newsroom Live', {
      subTitle: 'Episode 8',
      episode: 'S1 E8',
    });
    const guide = new Map([['1.id', { now, next: null }]]);
    const hits = buildChannelHits([channel(1, 'News One'), channel(2, 'News One HD', null)], guide, NOW);
    expect(hits[0]).toMatchObject({ nowTitle: 'Newsroom Live: Episode 8. S1 E8', progressPermille: 500 });
    expect(hits[1]).toMatchObject({ nowTitle: null, progressPermille: 0 });
  });

  it('marks airing hits with progress + remaining and upcoming hits with bare times', () => {
    const airing = programHit(
      program('1.id', NOW - HOUR, NOW + HOUR),
      channel(1, 'News One'),
      NOW,
      TWELVE_HOUR,
    );
    expect(airing).toMatchObject({
      remaining: '60 min',
      progressPermille: 500,
      timeText: '01:00 — 03:00 PM',
    });
    const upcoming = programHit(
      program('1.id', NOW + HOUR, NOW + 2 * HOUR),
      channel(1, 'News One'),
      NOW,
      TWELVE_HOUR,
    );
    expect(upcoming).toMatchObject({ remaining: null, progressPermille: 0 });
  });

  it('groups programme matches per channel in name order, airings chronological and never deduped', () => {
    const channels = [
      channel(3, 'News One +1', 'c.id'),
      channel(1, 'News One', 'a.id'),
      channel(2, 'Hidden', 'z.id', { hidden: true }),
    ];
    const matches = [
      program('c.id', NOW + 3 * HOUR, NOW + 4 * HOUR, 'Newsroom Live'),
      program('a.id', NOW + 2 * HOUR, NOW + 3 * HOUR, 'Newsroom Live'),
      program('a.id', NOW + HOUR, NOW + 2 * HOUR, 'Newsroom Live'),
      program('unknown.id', NOW, NOW + HOUR, 'Newsroom Live'),
    ];
    const groups = buildProgramChannels(matches, channels, NOW, TWELVE_HOUR);
    expect(groups.map((g) => g.channel.name)).toEqual(['News One', 'News One +1']);
    expect(groups[0]?.airings.map((a) => a.program.startMs)).toEqual([NOW + HOUR, NOW + 2 * HOUR]);
  });

  it('maps EPG ids to the first channel carrying them, honoring the override', () => {
    const map = channelsByEpgId([
      channel(1, 'A', 'x'),
      channel(2, 'B', 'x'),
      channel(3, 'C', 'y', { epgOverride: 'z' }),
      channel(4, 'D', null),
    ]);
    expect(map.get('x')?.id).toBe(1);
    expect(map.get('z')?.id).toBe(3);
    expect(map.has('y')).toBe(false);
  });

  it('knows an empty result set', () => {
    expect(isEmptyResults(EMPTY_RESULTS)).toBe(true);
    expect(
      isEmptyResults({ query: 'x', channels: [], programs: [{ channel: channel(1, 'A'), airings: [] }] }),
    ).toBe(false);
  });
});
