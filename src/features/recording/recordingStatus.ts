import type { RecordingRow } from '@/core/db/types';

/**
 * Lifecycle of a DVR entry, persisted by name in the `recordings` table
 * (Android `RecordingStatus`): SCHEDULED → RECORDING → DONE | FAILED, plus
 * SCHEDULED → FAILED for a missed window. Every edge is a guarded Dexie
 * update in `recordingStoreTransitions.ts` that reports whether it happened.
 */
// @stateMachine('Recording row')
export type RecordingStatus = 'SCHEDULED' | 'RECORDING' | 'DONE' | 'FAILED';

const STATUSES: readonly RecordingStatus[] = ['SCHEDULED', 'RECORDING', 'DONE', 'FAILED'];

/** Unknown raw values read back as FAILED, never crash the library. */
export function statusOf(raw: string): RecordingStatus {
  return STATUSES.find((status) => status === raw) ?? 'FAILED';
}

/** The row's parsed status. */
export function recordingStatus(row: Pick<RecordingRow, 'status'>): RecordingStatus {
  return statusOf(row.status);
}

/** SCHEDULED or RECORDING: the slot is claimed. */
export function isPlanned(status: RecordingStatus): boolean {
  return status === 'SCHEDULED' || status === 'RECORDING';
}
