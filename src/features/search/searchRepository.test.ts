import { beforeEach, describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import { TWELVE_HOUR } from './programTimes';
import { SearchRepository } from './searchRepository';

const HOUR = 3_600_000;
const NOW = new Date(2026, 8, 13, 14, 0).getTime();

describe('SearchRepository', () => {
  let db: TellyDb;
  let repository: SearchRepository;

  beforeEach(async () => {
    db = freshDb();
    const channels = new ChannelRepository(db);
    const programs = new ProgramRepository(db);
    await db.playlists.add({
      id: 1,
      name: 'p',
      url: 'u',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    await channels.replaceForPlaylist(1, [
      channelImport('News One'),
      channelImport('News One HD'),
      channelImport('Sports Arena'),
      channelImport('Hidden News'),
    ]);
    const hidden = (await channels.all()).find((c) => c.name === 'Hidden News');
    if (hidden !== undefined) await channels.updateFlags(hidden.id, { hidden: true });
    await programs.replaceFor(
      ['news-one.id', 'news-one-hd.id', 'hidden-news.id'],
      [
        programImport('news-one.id', NOW - HOUR, NOW + HOUR, 'Morning Report'),
        programImport('news-one.id', NOW + HOUR, NOW + 2 * HOUR, 'Newsroom Live'),
        programImport('news-one.id', NOW - 3 * HOUR, NOW - 2 * HOUR, 'Newsroom Live'),
        programImport('news-one-hd.id', NOW, NOW + HOUR, 'Newsroom Live'),
        programImport('hidden-news.id', NOW, NOW + HOUR, 'Newsroom Live'),
      ],
    );
    repository = new SearchRepository({ channels, programs });
  });

  it('returns empty shelves for a blank query', async () => {
    expect(await repository.search('   ', NOW, TWELVE_HOUR)).toMatchObject({ channels: [], programs: [] });
  });

  it('lists visible channels by name word-prefix with their airing programme, in name order', async () => {
    const results = await repository.search('news', NOW, TWELVE_HOUR);
    expect(results.channels.map((hit) => hit.channel.name)).toEqual(['News One', 'News One HD']);
    expect(results.channels[0]?.nowTitle).toBe('Morning Report');
    expect(results.channels[1]?.nowTitle).toBe('Newsroom Live');
  });

  it('matches channel numbers by prefix for digits-only queries', async () => {
    const results = await repository.search('2', NOW, TWELVE_HOUR);
    expect(results.channels.map((hit) => hit.channel.name)).toEqual(['News One HD']);
  });

  it('groups still-airing title matches per visible channel, chronological, ended rows dropped', async () => {
    const results = await repository.search('newsroom', NOW, TWELVE_HOUR);
    expect(results.programs.map((g) => g.channel.name)).toEqual(['News One', 'News One HD']);
    expect(results.programs[0]?.airings.map((a) => a.program.startMs)).toEqual([NOW + HOUR]);
    expect(results.programs[1]?.airings[0]?.remaining).toBe('60 min');
  });

  it('shifts programme times by the channel EPG offset', async () => {
    const channels = new ChannelRepository(db);
    const newsOne = (await channels.all()).find((c) => c.name === 'News One');
    if (newsOne !== undefined) await channels.updateOverrides(newsOne.id, { epgOffsetMinutes: 60 });
    const results = await repository.search('newsroom', NOW, TWELVE_HOUR);
    expect(results.programs[0]?.airings[0]?.program.startMs).toBe(NOW + 2 * HOUR);
  });
});
