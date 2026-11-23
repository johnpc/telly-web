import { describe, expect, it, vi } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import { RecordingCenter, type RecordingCenterDeps } from './recordingCenter';
import type { RecordingEngine } from './recordingEngine';
import { RecordingFiles } from './recordingFiles';
import type { RecordingScheduler } from './recordingScheduler';
import { RecordingStore } from './recordingStore';
import { FakeDirectory, bytes, fakeChannel } from './recordingTestSupport';
import { FALLBACK_DURATION_MS } from './streamRecorder';

const NOW = 1_000_000;

interface Rig {
  center: RecordingCenter;
  store: RecordingStore;
  dir: FakeDirectory;
  engine: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    whenSettled: ReturnType<typeof vi.fn>;
    recoverStale: ReturnType<typeof vi.fn>;
  };
  scheduler: { start: ReturnType<typeof vi.fn> };
}

function rig(programme: RecordingCenterDeps['programmes'] = () => Promise.resolve(null)): Rig {
  const dir = new FakeDirectory();
  const store = new RecordingStore(freshDb(), () => NOW);
  const engine = {
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    whenSettled: vi.fn(),
    recoverStale: vi.fn(),
  };
  const scheduler = { start: vi.fn().mockReturnValue(() => undefined) };
  const center = new RecordingCenter({
    store,
    engine: engine as unknown as RecordingEngine,
    scheduler: scheduler as unknown as RecordingScheduler,
    files: new RecordingFiles(
      () => Promise.resolve(dir),
      () => 'stamp',
    ),
    programmes: programme,
    clock: () => NOW,
    extensionOf: (url) => Promise.resolve(url.endsWith('.m3u8') ? 'mp4' : 'ts'),
  });
  return { center, store, dir, engine, scheduler };
}

describe('RecordingCenter', () => {
  it('instant record schedules until the airing programme ends under its title and starts the engine', async () => {
    const { center, store, engine } = rig(() =>
      Promise.resolve({ title: 'Newsroom Live', endMs: NOW + 600_000 }),
    );
    expect(await center.toggleInstant(fakeChannel())).toEqual({ kind: 'Done' });
    const [row] = await center.recordings();
    expect(row).toMatchObject({
      channelKey: 'news-one.id',
      channelName: 'News One',
      title: 'Newsroom Live',
      startMs: NOW,
      plannedEndMs: NOW + 600_000,
      status: 'SCHEDULED',
      filePath: 'News_One-stamp.ts',
    });
    expect(engine.start).toHaveBeenCalledWith(expect.objectContaining({ id: row?.id }));
    expect((await store.all()).length).toBe(1);
  });

  it('falls back to the 3 h window and the channel name without EPG, and honours the display name', async () => {
    const { center } = rig();
    const channel = fakeChannel('HLS Live', {
      tvgId: null,
      customName: 'Live HLS',
      streamUrl: 'http://x/live.m3u8',
    });
    await center.toggleInstant(channel);
    const [row] = await center.recordings();
    expect(row).toMatchObject({
      title: 'Live HLS',
      channelName: 'Live HLS',
      plannedEndMs: NOW + FALLBACK_DURATION_MS,
      filePath: 'Live_HLS-stamp.mp4',
      channelKey: 'http://x/live.m3u8|HLS Live',
    });
  });

  it('a second Record on a channel that is recording offers Stop', async () => {
    const { center, store } = rig();
    await center.toggleInstant(fakeChannel());
    const [row] = await store.all();
    if (row === undefined) throw new Error('no row');
    await store.repository.markStarted(row.id, 'RECORDING', NOW);
    expect(await center.toggleInstant(fakeChannel())).toEqual({
      kind: 'StopConfirm',
      recordingId: row.id,
      channelName: 'News One',
    });
  });

  it('schedules a programme slot once, stops, deletes (row + file) and deletes everything', async () => {
    const { center, store, dir, engine } = rig();
    expect(await center.scheduleProgramme(fakeChannel(), 'Later Show', NOW + 1, NOW + 2)).toEqual({
      kind: 'Done',
    });
    await center.scheduleProgramme(fakeChannel(), 'Later Show', NOW + 1, NOW + 2);
    const rows = await center.recordings();
    expect(rows.length).toBe(1);
    const row = rows[0];
    if (row === undefined) throw new Error('no row');
    await center.stop(row.id);
    expect(engine.stop).toHaveBeenCalledWith(row.id);
    dir.files.set(row.filePath, [bytes(1)]);
    expect((await center.blobOf(row))?.size).toBe(1);
    await center.delete(row.id);
    expect(engine.stop).toHaveBeenCalledTimes(2);
    expect(await store.byId(row.id)).toBeNull();
    expect(dir.files.has(row.filePath)).toBe(false);
    await center.delete(row.id); // gone: no-op
    await center.scheduleProgramme(fakeChannel(), null, NOW + 1, NOW + 2);
    const [live] = await store.all();
    if (live === undefined) throw new Error('no row');
    await store.repository.markStarted(live.id, 'RECORDING', NOW);
    dir.files.set('stray.ts', [bytes(1)]);
    await center.deleteAll();
    expect(engine.stop).toHaveBeenCalledWith(live.id);
    expect(await store.all()).toEqual([]);
    expect(dir.files.size).toBe(0);
  });

  it('start() recovers stale rows then watches the schedule; whenSettled forwards to the engine', async () => {
    const { center, engine, scheduler } = rig();
    const stop = await center.start();
    expect(engine.recoverStale).toHaveBeenCalled();
    expect(scheduler.start).toHaveBeenCalled();
    expect(typeof stop).toBe('function');
    engine.whenSettled.mockResolvedValue(undefined);
    await center.whenSettled(7);
    expect(engine.whenSettled).toHaveBeenCalledWith(7);
  });
});
