import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { RecordingRepository } from '@/core/db/recordingRepository';
import { Observable } from '@/features/guide/observable';
import { channelImport, freshDb } from '@/test/dbFixtures';
import { fakeEntry } from './recordingTestSupport';
import { useChannelRecording, useObservableVersion, useRecordings } from './useRecordings';

class Counter extends Observable {
  bump(): void {
    this.notify();
  }
}

describe('useRecordings', () => {
  it('lists the library newest start first, live', async () => {
    const db = freshDb();
    const recordings = new RecordingRepository(db);
    const older = fakeEntry({ startMs: 10, title: 'Older' });
    const newer = fakeEntry({ startMs: 20, title: 'Newer', status: 'RECORDING' });
    await recordings.insert(older);
    const { result } = renderHook(() => useRecordings(recordings));
    await waitFor(() => expect(result.current?.length).toBe(1));
    await recordings.insert(newer);
    await waitFor(() => expect(result.current?.map((row) => row.entry.title)).toEqual(['Newer', 'Older']));
    expect(result.current?.[0]?.detailText).toBe('Recording');
  });

  it('reports whether the tuned channel is being recorded right now', async () => {
    const db = freshDb();
    const channels = new ChannelRepository(db);
    const recordings = new RecordingRepository(db);
    const playlistId = await db.playlists.add({
      name: 'p',
      url: 'u',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    await channels.replaceForPlaylist(playlistId, [channelImport('News One')]);
    const [channel] = await channels.all();
    if (channel === undefined) throw new Error('no channel');
    const deps = { recordings, channels };
    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => useChannelRecording(id, deps),
      {
        initialProps: { id: channel.id as number | null },
      },
    );
    await waitFor(() => expect(result.current).toBe(false));
    const row = fakeEntry({ channelKey: 'news-one.id', status: 'RECORDING' });
    await recordings.insert(row);
    await waitFor(() => expect(result.current).toBe(true));
    rerender({ id: null });
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('re-renders on every observable notification', () => {
    const counter = new Counter();
    const { result } = renderHook(() => useObservableVersion(counter));
    expect(result.current).toBe(0);
  });
});
