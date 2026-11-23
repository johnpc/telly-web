import { type TellyDb, tellyDb } from './tellyDb';
import type { RecordingRow } from './types';

export type RecordingImport = Omit<RecordingRow, 'id'>;

const PLANNED = new Set(['SCHEDULED', 'RECORDING']);

/** DVR queries: the library list, scheduler lookups and status updates (Android `RecordingDao`). */
export class RecordingRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  insert(recording: RecordingImport): Promise<number> {
    return this.db.recordings.add(recording);
  }

  /** The library: newest start first (in-progress entries sort on top). */
  async all(): Promise<RecordingRow[]> {
    return (await this.db.recordings.toArray()).sort((a, b) => b.startMs - a.startMs || b.id - a.id);
  }

  /** The scheduler's watch list, soonest start first. */
  async scheduled(): Promise<RecordingRow[]> {
    const rows = await this.db.recordings.where('status').equals('SCHEDULED').toArray();
    return rows.sort((a, b) => a.startMs - b.startMs || a.id - b.id);
  }

  async byId(id: number): Promise<RecordingRow | null> {
    return (await this.db.recordings.get(id)) ?? null;
  }

  async byStatus(...statuses: readonly string[]): Promise<RecordingRow[]> {
    return (
      await this.db.recordings
        .where('status')
        .anyOf([...statuses])
        .toArray()
    ).sort((a, b) => a.id - b.id);
  }

  async countPlanned(channelKey: string, startMs: number): Promise<number> {
    const rows = await this.db.recordings
      .where('[channelKey+startMs]')
      .equals([channelKey, startMs])
      .toArray();
    return rows.filter((row) => PLANNED.has(row.status)).length;
  }

  /** one of `from` -> `status` with the end stamp and size; 0 rows when the row was not in `from`. */
  finish(
    id: number,
    from: readonly string[],
    status: string,
    endMs: number,
    sizeBytes: number,
  ): Promise<number> {
    return this.db.recordings
      .where('id')
      .equals(id)
      .and((row) => from.includes(row.status))
      .modify({ status, endMs, sizeBytes });
  }

  /** `from` -> `status` with nothing else touched; 0 rows when the row was not in `from`. */
  transition(id: number, from: string, status: string): Promise<number> {
    return this.db.recordings
      .where('id')
      .equals(id)
      .and((row) => row.status === from)
      .modify({ status });
  }

  /** SCHEDULED -> `status`; 0 rows when cancelled/deleted/already started. */
  markStarted(id: number, status: string, startMs: number): Promise<number> {
    return this.db.recordings
      .where('id')
      .equals(id)
      .and((row) => row.status === 'SCHEDULED')
      .modify({ status, startMs });
  }

  remove(id: number): Promise<void> {
    return this.db.recordings.delete(id);
  }

  removeAll(): Promise<void> {
    return this.db.recordings.clear();
  }
}

export const recordingRepository = new RecordingRepository();
