import type { RecordingRow } from '@/core/db/types';

/**
 * Lifecycle of a DVR entry, persisted by name in the `recordings` table
 * (Android `RecordingStatus`): SCHEDULED → RECORDING → DONE | FAILED, plus
 * SCHEDULED → FAILED for a missed window and, web-only, RECORDING → STOPPING
 * → DONE for the user's Stop (the row itself says it is closing its file, so
 * the library needs no optimistic copy). Every edge is a guarded Dexie update
 * in `recordingStoreTransitions.ts` that reports whether it happened.
 */
// @stateMachine('Recording row')
export type RecordingStatus = 'SCHEDULED' | 'RECORDING' | 'STOPPING' | 'DONE' | 'FAILED';

const STATUSES: readonly RecordingStatus[] = ['SCHEDULED', 'RECORDING', 'STOPPING', 'DONE', 'FAILED'];

/** RECORDING or STOPPING: a capture is (still) writing this row's file. */
export const LIVE_STATUSES: readonly RecordingStatus[] = ['RECORDING', 'STOPPING'];

/** Unknown raw values read back as FAILED, never crash the library. */
export function statusOf(raw: string): RecordingStatus {
  return STATUSES.find((status) => status === raw) ?? 'FAILED';
}

/** The row's parsed status. */
export function recordingStatus(row: Pick<RecordingRow, 'status'>): RecordingStatus {
  return statusOf(row.status);
}

/** Why a capture on a one-stream provider is FAILED (the `Provider stream limit` registry's verdict). */
export const RECORDING_LIMIT_REASON = 'Provider allows one stream at a time';

/** Web-only: why a FAILED row gave up, stored beside the row (Dexie keeps undeclared fields). */
export interface RecordingFailure {
  failReason?: string;
}

/** The row as the recording slice writes and reads it: the Android columns plus the failure reason. */
export function withFailure(row: RecordingRow): RecordingRow & RecordingFailure {
  return row;
}

export function failReasonOf(row: RecordingRow): string | null {
  return withFailure(row).failReason ?? null;
}

/** SCHEDULED or RECORDING: the slot is claimed. */
export function isPlanned(status: RecordingStatus): boolean {
  return status === 'SCHEDULED' || status === 'RECORDING';
}
