import { RecordingRepository, type RecordingImport } from '@/core/db/recordingRepository';
import { type TellyDb, tellyDb } from '@/core/db/tellyDb';
import type { RecordingRow } from '@/core/db/types';
import { LIVE_STATUSES, statusOf, withFailure } from './recordingStatus';

/**
 * Dexie-backed state of the DVR (Android `RecordingStore`): inserts entries
 * and feeds the library list; the status transitions live in
 * `recordingStoreTransitions.ts` (the one owner of the SCHEDULED ->
 * RECORDING -> DONE | FAILED machine). File-system work stays in
 * `RecordingFiles`; this class only owns rows.
 */
export class RecordingStore {
  readonly repository: RecordingRepository;

  constructor(
    private readonly db: TellyDb = tellyDb,
    readonly clock: () => number = () => Date.now(),
  ) {
    this.repository = new RecordingRepository(db);
  }

  /** The library, newest start first. */
  all(): Promise<RecordingRow[]> {
    return this.repository.all();
  }

  /** The scheduler's watch list, soonest start first. */
  scheduled(): Promise<RecordingRow[]> {
    return this.repository.scheduled();
  }

  /** Inserts a SCHEDULED entry; duplicates of a planned slot are ignored (null). */
  async schedule(entry: RecordingImport): Promise<RecordingRow | null> {
    if ((await this.repository.countPlanned(entry.channelKey, entry.startMs)) > 0) return null;
    const row = { ...entry, status: 'SCHEDULED' };
    const id = await this.repository.insert(row);
    return { ...row, id };
  }

  /** The in-progress recording of `channelKey`, if any. */
  async activeFor(channelKey: string): Promise<RecordingRow | null> {
    return (await this.allRecording()).find((row) => row.channelKey === channelKey) ?? null;
  }

  byId(id: number): Promise<RecordingRow | null> {
    return this.repository.byId(id);
  }

  /** Every entry currently claiming to write its file (recovery sweep input). */
  allRecording(): Promise<RecordingRow[]> {
    return this.repository.byStatus(...LIVE_STATUSES);
  }

  /** Live size while the capture grows; a no-op once the row is finalized. */
  updateSize(id: number, sizeBytes: number): Promise<number> {
    return this.db.recordings
      .where('id')
      .equals(id)
      .and((row) => LIVE_STATUSES.includes(statusOf(row.status)))
      .modify({ sizeBytes });
  }

  /** Why a FAILED row gave up (web-only, stored beside the row; read by `failReasonOf`). */
  setFailReason(id: number, reason: string): Promise<number> {
    return this.db.recordings
      .where('id')
      .equals(id)
      .modify((row) => {
        withFailure(row).failReason = reason;
      });
  }

  remove(id: number): Promise<void> {
    return this.repository.remove(id);
  }

  removeAll(): Promise<void> {
    return this.repository.removeAll();
  }
}
