// The recording status machine (docs/state-machines/recording.md): SCHEDULED ->
// RECORDING -> DONE | FAILED, plus SCHEDULED -> FAILED for a missed window and
// RECORDING -> STOPPING -> DONE for the user's Stop.
// Every edge is guarded by the row's CURRENT status inside the repository's
// single `modify` transaction (`and(status === from)`) and reports whether it
// happened, so a cancel racing a start, a double finish, or a finish on a
// deleted row can never resurrect or rewrite a row.
import type { RecordingStore } from './recordingStore';
import { LIVE_STATUSES, type RecordingStatus } from './recordingStatus';

/** SCHEDULED -> RECORDING; the start stamp becomes the actual start. */
export async function markStarted(store: RecordingStore, id: number): Promise<boolean> {
  return (await store.repository.markStarted(id, 'RECORDING', store.clock())) > 0;
}

/** RECORDING -> STOPPING: the user asked to stop; the capture is closing its file. */
export async function markStopping(store: RecordingStore, id: number): Promise<boolean> {
  return (await store.repository.transition(id, 'RECORDING', 'STOPPING')) > 0;
}

/** RECORDING | STOPPING -> DONE with the final size. */
export function complete(store: RecordingStore, id: number, sizeBytes: number): Promise<boolean> {
  return finish(store, LIVE_STATUSES, 'DONE', id, sizeBytes);
}

/** RECORDING | STOPPING -> FAILED (the copy gave up before writing anything). */
export function fail(store: RecordingStore, id: number, sizeBytes = 0): Promise<boolean> {
  return finish(store, LIVE_STATUSES, 'FAILED', id, sizeBytes);
}

/** SCHEDULED -> FAILED (the start window passed while telly was not open). */
export function failMissed(store: RecordingStore, id: number): Promise<boolean> {
  return finish(store, ['SCHEDULED'], 'FAILED', id, 0);
}

async function finish(
  store: RecordingStore,
  from: readonly RecordingStatus[],
  to: RecordingStatus,
  id: number,
  sizeBytes: number,
): Promise<boolean> {
  return (await store.repository.finish(id, from, to, store.clock(), sizeBytes)) > 0;
}
