import { afterEach, describe, expect, it, vi } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import { RecordingEngine } from './recordingEngine';
import { RecordingFiles } from './recordingFiles';
import { RecordingStore } from './recordingStore';
import { FakeDirectory, bytes, fakeEntry } from './recordingTestSupport';
import type { StreamRecorder } from './streamRecorder';

interface Rig {
  store: RecordingStore;
  dir: FakeDirectory;
  engine: RecordingEngine;
  clock: { now: number };
}

function rig(recorder: StreamRecorder, retryDelayMs = 0): Rig {
  const clock = { now: 1_000 };
  const dir = new FakeDirectory();
  const store = new RecordingStore(freshDb(), () => clock.now);
  const files = new RecordingFiles(
    () => Promise.resolve(dir),
    () => 'stamp',
  );
  const engine = new RecordingEngine({
    store,
    files,
    clock: () => clock.now,
    recorder,
    retryDelayMs,
    sizeUpdateMs: 0,
  });
  return { store, dir, engine, clock };
}

const ENTRY = fakeEntry({ filePath: 'cap.ts', plannedEndMs: 50_000 });

/** A "live" source: writes one chunk per attempt and waits for the stop. */
const liveRecorder: StreamRecorder = async (_url, sink, ctx) => {
  await sink.write(bytes(1, 2, 3));
  await ctx.delay(60_000);
  return 3;
};

describe('RecordingEngine', () => {
  afterEach(() => vi.restoreAllMocks());

  it('marks the row RECORDING, grows its size, and a user stop finalizes it DONE with the file size', async () => {
    const { store, dir, engine } = rig(liveRecorder);
    const row = await store.schedule(ENTRY);
    if (row === null) throw new Error('not scheduled');
    engine.start(row);
    engine.start(row); // idempotent
    expect(engine.isActive(row.id)).toBe(true);
    await vi.waitFor(async () => expect((await store.byId(row.id))?.status).toBe('RECORDING'));
    await vi.waitFor(async () => expect((await store.byId(row.id))?.sizeBytes).toBe(3));
    await engine.stop(row.id);
    expect(engine.isActive(row.id)).toBe(false);
    expect(await store.byId(row.id)).toMatchObject({ status: 'DONE', sizeBytes: 3 });
    expect(dir.bytesOf('cap.ts')).toEqual(bytes(1, 2, 3));
    await engine.stop(row.id); // not active: no-op
    await expect(engine.whenSettled(row.id)).resolves.toBeUndefined();
  });

  it('fails a capture whose attempts never wrote a byte, logging the fetch error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const recorder: StreamRecorder = () => Promise.reject(new Error('HTTP 503'));
    const { store, engine } = rig(recorder);
    const row = await store.schedule(ENTRY);
    if (row === null) throw new Error('not scheduled');
    engine.start(row);
    await engine.whenSettled(row.id);
    expect((await store.byId(row.id))?.status).toBe('FAILED');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
  });

  it('does nothing for a row that is no longer SCHEDULED (cancel raced the start)', async () => {
    const recorder = vi.fn<StreamRecorder>();
    const { store, engine } = rig(recorder);
    const row = await store.schedule(ENTRY);
    if (row === null) throw new Error('not scheduled');
    await store.remove(row.id);
    engine.start(row);
    await engine.whenSettled(row.id);
    expect(recorder).not.toHaveBeenCalled();
  });

  it('stops at the planned end even while a fetch is parked', async () => {
    const { store, engine, clock } = rig(liveRecorder);
    const row = await store.schedule({ ...ENTRY, plannedEndMs: clock.now + 20 });
    if (row === null) throw new Error('not scheduled');
    engine.start(row);
    // The wall clock moves on while the fetch is parked; the end timer aborts it.
    setTimeout(() => (clock.now += 1_000), 5);
    await engine.whenSettled(row.id);
    expect((await store.byId(row.id))?.status).toBe('DONE');
  });

  it('recovers rows left RECORDING by a closed tab from the file on disk', async () => {
    const { store, dir, engine } = rig(liveRecorder);
    const withFile = await store.schedule({ ...ENTRY, filePath: 'a.ts' });
    const empty = await store.schedule({ ...ENTRY, filePath: 'b.ts', channelKey: 'other' });
    if (withFile === null || empty === null) throw new Error('not scheduled');
    await store.repository.markStarted(withFile.id, 'RECORDING', 1);
    await store.repository.markStarted(empty.id, 'RECORDING', 1);
    dir.files.set('a.ts', [bytes(1, 2)]);
    await engine.recoverStale();
    expect(await store.byId(withFile.id)).toMatchObject({ status: 'DONE', sizeBytes: 2 });
    expect((await store.byId(empty.id))?.status).toBe('FAILED');
  });
});
