import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ReminderRepository } from '@/core/db/reminderRepository';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { reminderItems, useReminders } from './useReminders';

describe('useReminders', () => {
  it('lists scheduled reminders with channel name and air time, and deletes one', async () => {
    const db = freshDb();
    const channels = new ChannelRepository(db);
    const reminders = new ReminderRepository(db);
    await db.playlists.add({
      id: 1,
      name: 'p',
      url: 'u',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    await channels.replaceForPlaylist(1, [channelImport('News One')]);
    const channel = (await channels.all())[0];
    const startMs = new Date(2026, 8, 13, 14, 45).getTime();
    const id = await reminders.upsert({
      channelId: channel?.id ?? 0,
      title: 'Newsroom Live',
      startMs,
      stopMs: startMs + 1,
    });
    await reminders.upsert({ channelId: 999, title: 'Orphan', startMs: startMs + 1, stopMs: startMs + 2 });
    const { result } = renderHook(() => useReminders(reminders, channels));
    await waitFor(() => expect(result.current.items?.length).toBe(2));
    expect(result.current.items?.[0]).toEqual({
      id,
      title: 'Newsroom Live',
      channelName: 'News One',
      airTime: 'Sun, Sep 13, 2:45 PM',
      startMs,
    });
    expect(result.current.items?.[1]?.channelName).toBe('');
    await result.current.remove(id);
    await waitFor(() => expect(result.current.items?.map((item) => item.title)).toEqual(['Orphan']));
    expect(reminderItems([], [])).toEqual([]);
  });
});
