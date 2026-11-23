import { describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import { airingProgramme } from './airingProgramme';

describe('airingProgramme', () => {
  it('resolves the airing programme with the channel EPG offset applied; null without an EPG id', async () => {
    const db = freshDb();
    const channels = new ChannelRepository(db);
    const programs = new ProgramRepository(db);
    await channels.replaceForPlaylist(1, [channelImport('News One'), channelImport('Bare', { tvgId: null })]);
    const [news, bare] = await channels.forPlaylist(1);
    if (news === undefined || bare === undefined) throw new Error('seed');
    const now = 10_000_000;
    await programs.replaceFor(
      ['news-one.id'],
      [
        programImport('news-one.id', now - 3_600_000, now, 'Earlier'),
        programImport('news-one.id', now, now + 3_600_000, 'Now'),
      ],
    );
    const deps = { programs, channels };
    expect((await airingProgramme(news, now, deps))?.title).toBe('Now');
    await channels.updateOverrides(news.id, { epgOffsetMinutes: 60 });
    expect((await airingProgramme(news, now, deps))?.title).toBe('Earlier');
    expect(await airingProgramme(bare, now, deps)).toBeNull();
  });
});
