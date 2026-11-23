import { describe, expect, it, vi } from 'vitest';
import { ChannelRepository } from '@/core/db/channelRepository';
import { ProgramRepository } from '@/core/db/programRepository';
import { channelImport, freshDb, programImport } from '@/test/dbFixtures';
import {
  airingLookup,
  createRecordingRuntime,
  deleteAllRecordings,
  recordingCenter,
  recordingRuntime,
} from './recordingRuntime';

describe('airingLookup', () => {
  it('finds the airing programme with the channel EPG offset applied', async () => {
    const db = freshDb();
    const channels = new ChannelRepository(db);
    const programs = new ProgramRepository(db);
    const playlistId = await db.playlists.add({
      name: 'p',
      url: 'http://x/p.m3u',
      epgUrl: null,
      lastUpdatedMs: 0,
      epgLastUpdatedMs: 0,
      epgFailedAtMs: 0,
    });
    await channels.replaceForPlaylist(playlistId, [channelImport('News One')]);
    const [channel] = await channels.all();
    if (channel === undefined) throw new Error('no channel');
    await channels.updateOverrides(channel.id, { epgOffsetMinutes: 60 });
    // Stored 10:00-11:00 shifts to 11:00-12:00 for this channel.
    await programs.replaceFor(
      ['news-one.id'],
      [programImport('news-one.id', 36_000_000, 39_600_000, 'Newsroom')],
    );
    const lookup = airingLookup({ channels, programs });
    expect(await lookup('news-one.id', 36_000_000 + 30 * 60_000)).toBeNull();
    expect(await lookup('news-one.id', 39_600_000 + 30 * 60_000)).toEqual({
      title: 'Newsroom',
      endMs: 43_200_000,
    });
    expect(await lookup('unknown.id', 1)).toBeNull();
  });
});

describe('createRecordingRuntime', () => {
  it('starts the scheduler once for every host and stops with the last one', async () => {
    const runtime = createRecordingRuntime(() => 1_000);
    const stopA = runtime.start();
    const stopB = runtime.start();
    expect(await runtime.center.recordings()).toEqual([]);
    stopA();
    stopB();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('exposes the production center and the settings pane entry point', async () => {
    expect(recordingRuntime.center).toBe(recordingCenter);
    const spy = vi.spyOn(recordingCenter, 'deleteAll').mockResolvedValue(undefined);
    await deleteAllRecordings();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
