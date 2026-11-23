import { describe, expect, it, vi } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import type { RecordingEngine } from './recordingEngine';
import { RecordingScheduler } from './recordingScheduler';
import { RecordingStore } from './recordingStore';
import { fakeEntry } from './recordingTestSupport';
import type { RecordingTickerDeps } from './recordingTicker';

const entry = fakeEntry;

describe('RecordingScheduler', () => {
  it('starts due rows, fails rows whose whole window passed, and leaves future rows alone', async () => {
    const db = freshDb();
    const store = new RecordingStore(db, () => 1_000);
    const due = await store.schedule(entry({ channelKey: 'due', startMs: 900, plannedEndMs: 5_000 }));
    const missed = await store.schedule(entry({ channelKey: 'missed', startMs: 100, plannedEndMs: 1_000 }));
    const future = await store.schedule(entry({ channelKey: 'future', startMs: 2_000, plannedEndMs: 5_000 }));
    const engine = { isActive: vi.fn().mockReturnValue(false), start: vi.fn() } as unknown as RecordingEngine;
    const scheduler = new RecordingScheduler(store, engine, () => 1_000);
    await scheduler.tick();
    expect(engine.start).toHaveBeenCalledTimes(1);
    expect(engine.start).toHaveBeenCalledWith(expect.objectContaining({ id: due?.id }));
    expect((await store.byId(missed?.id ?? -1))?.status).toBe('FAILED');
    expect((await store.byId(future?.id ?? -1))?.status).toBe('SCHEDULED');
  });

  it('never restarts a row the engine is already capturing', async () => {
    const store = new RecordingStore(freshDb(), () => 1_000);
    await store.schedule(entry({ startMs: 0, plannedEndMs: 5_000 }));
    const engine = { isActive: vi.fn().mockReturnValue(true), start: vi.fn() } as unknown as RecordingEngine;
    await new RecordingScheduler(store, engine, () => 1_000).tick();
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('start() wires the ticker and the returned function stops it', async () => {
    const db = freshDb();
    const store = new RecordingStore(db, () => 1_000);
    const engine = { isActive: () => false, start: vi.fn() } as unknown as RecordingEngine;
    const ticker: RecordingTickerDeps = { db, intervalMs: 60_000, visibility: null };
    const stop = new RecordingScheduler(store, engine, () => 1_000, ticker).start();
    await store.schedule(entry({ startMs: 0, plannedEndMs: 5_000 }));
    await vi.waitFor(() => expect(engine.start).toHaveBeenCalledTimes(1));
    stop();
  });
});
