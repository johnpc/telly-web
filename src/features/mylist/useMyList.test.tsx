import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { MyListRepository } from '@/core/db/myListRepository';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { useMyList } from './useMyList';

describe('useMyList', () => {
  it('lists saved programmes newest first, live, and removes one', async () => {
    const db = freshDb();
    const channels = new ChannelRepository(db);
    const myList = new MyListRepository(db);
    await db.playlists.add({
      id: 1,
      name: 'p',
      url: 'u',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    await channels.replaceForPlaylist(1, [channelImport('News One'), channelImport('News One HD')]);
    const now = 1_000_000;
    await myList.upsert({
      channelKey: 'news-one.id',
      startMs: now + 1,
      endMs: now + 2,
      title: 'Later',
      description: null,
      addedAtMs: 1,
    });
    await myList.upsert({
      channelKey: 'news-one-hd.id',
      startMs: now - 1,
      endMs: now + 2,
      title: 'Now',
      description: 'd',
      addedAtMs: 2,
    });
    const { result } = renderHook(() => useMyList({ myList, channels, clock: () => now }));
    await waitFor(() => expect(result.current.rows?.length).toBe(2));
    expect(result.current.rows?.map((row) => row.entry.title)).toEqual(['Now', 'Later']);
    const first = result.current.rows?.[0];
    if (first !== undefined) await result.current.remove(first);
    await waitFor(() => expect(result.current.rows?.map((row) => row.entry.title)).toEqual(['Later']));
  });
});
