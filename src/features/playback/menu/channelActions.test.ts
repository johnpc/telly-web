import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import type { TellyDb } from '@/core/db/tellyDb';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { ChannelActions, channelActions } from './channelActions';

describe('ChannelActions', () => {
  let db: TellyDb;
  let repo: ChannelRepository;
  beforeEach(async () => {
    db = freshDb();
    repo = new ChannelRepository(db);
    await repo.replaceForPlaylist(1, [channelImport('A')]);
  });
  afterEach(() => db.delete());

  it('persists favorite, hidden and blocked flags', async () => {
    const actions = new ChannelActions(repo);
    const [a] = await repo.forPlaylist(1);
    if (a === undefined) throw new Error('no channel');
    await actions.toggleFavorite(a);
    await actions.toggleBlocked(a);
    expect(await repo.byId(a.id)).toMatchObject({ favorite: true, blocked: true, hidden: false });
    await actions.hide({ ...a, favorite: true });
    expect((await repo.byId(a.id))?.hidden).toBe(true);
    expect(channelActions).toBeInstanceOf(ChannelActions);
  });
});
