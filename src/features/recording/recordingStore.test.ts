import { describe, expect, it } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import { RecordingStore } from './recordingStore';
import { complete, fail, failMissed, markStarted } from './recordingStoreTransitions';
import { fakeEntry } from './recordingTestSupport';

const entryOf = fakeEntry;

function storeAt(clock: number): RecordingStore {
  return new RecordingStore(freshDb(), () => clock);
}

describe('RecordingStore', () => {
  it('schedules an entry as SCHEDULED and ignores duplicates of a planned slot', async () => {
    const store = storeAt(5);
    const first = await store.schedule(entryOf({ status: 'DONE' }));
    expect(first?.status).toBe('SCHEDULED');
    expect(await store.schedule(entryOf())).toBeNull();
    expect((await store.all()).map((row) => row.id)).toEqual([first?.id]);
  });

  it('lists newest start first and finds the active recording of a channel', async () => {
    const store = storeAt(5);
    await store.schedule(entryOf({ startMs: 10 }));
    const later = await store.schedule(entryOf({ startMs: 20, channelKey: 'other' }));
    expect(later).not.toBeNull();
    if (later === null) return;
    expect((await store.all()).map((row) => row.startMs)).toEqual([20, 10]);
    expect(await store.activeFor('other')).toBeNull();
    expect(await markStarted(store, later.id)).toBe(true);
    expect((await store.activeFor('other'))?.id).toBe(later.id);
    expect((await store.allRecording()).length).toBe(1);
    expect((await store.scheduled()).length).toBe(1);
  });

  it('guards every transition on the current status and reports whether it happened', async () => {
    const store = storeAt(99);
    const row = await store.schedule(entryOf());
    if (row === null) throw new Error('not scheduled');
    expect(await complete(store, row.id, 10)).toBe(false); // not RECORDING yet
    expect(await markStarted(store, row.id)).toBe(true);
    expect(await markStarted(store, row.id)).toBe(false); // already started
    expect((await store.byId(row.id))?.startMs).toBe(99);
    expect(await failMissed(store, row.id)).toBe(false); // only SCHEDULED rows miss
    expect(await complete(store, row.id, 1234)).toBe(true);
    expect(await complete(store, row.id, 5)).toBe(false); // double finish
    expect(await fail(store, row.id)).toBe(false);
    const done = await store.byId(row.id);
    expect(done).toMatchObject({ status: 'DONE', sizeBytes: 1234, endMs: 99 });
  });

  it('fails a missed window from SCHEDULED and a dead copy from RECORDING', async () => {
    const store = storeAt(1);
    const missed = await store.schedule(entryOf({ channelKey: 'a' }));
    const dead = await store.schedule(entryOf({ channelKey: 'b' }));
    if (missed === null || dead === null) throw new Error('not scheduled');
    expect(await failMissed(store, missed.id)).toBe(true);
    await markStarted(store, dead.id);
    expect(await fail(store, dead.id)).toBe(true);
    expect((await store.byId(missed.id))?.status).toBe('FAILED');
    expect((await store.byId(dead.id))?.status).toBe('FAILED');
    expect(await complete(store, 404, 1)).toBe(false);
  });

  it('updates the growing size only while RECORDING, and removes rows', async () => {
    const store = storeAt(1);
    const row = await store.schedule(entryOf());
    if (row === null) throw new Error('not scheduled');
    expect(await store.updateSize(row.id, 5)).toBe(0);
    await markStarted(store, row.id);
    expect(await store.updateSize(row.id, 5)).toBe(1);
    expect((await store.byId(row.id))?.sizeBytes).toBe(5);
    await store.remove(row.id);
    expect(await store.byId(row.id)).toBeNull();
    await store.schedule(entryOf());
    await store.removeAll();
    expect(await store.all()).toEqual([]);
  });
});
