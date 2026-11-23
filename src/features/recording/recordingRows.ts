import type { RecordingRow } from '@/core/db/types';
import { type ClockStyle, CLOCK_12H, clockText } from '@/core/time';
import { sizeText } from '@/features/settings/rows/otherRows';
import { type RecordingStatus, recordingStatus } from './recordingStatus';

/** One library row: the entry plus its render-ready texts (Android `RecordingRow`). */
export interface RecordingListRow {
  entry: RecordingRow;
  status: RecordingStatus;
  /** "Sun, Sep 13, 2:45 PM" — the (planned) start, shared clock format. */
  dateText: string;
  /** Status detail: "Scheduled" / "Recording" / "42 min · 12.3 MB" / "Failed". */
  detailText: string;
}

export const RECORDINGS_TITLE = 'Recordings';
export const RECORDINGS_EMPTY = 'No recordings';
export const REC_BADGE = 'REC';

const MINUTE_MS = 60_000;

/** Pure assembly + formatting for the Recordings library list. */
export function recordingRows(
  entries: readonly RecordingRow[],
  style: ClockStyle = CLOCK_12H,
): RecordingListRow[] {
  return entries.map((entry) => {
    const status = recordingStatus(entry);
    return { entry, status, dateText: clockText(entry.startMs, style), detailText: detailOf(entry, status) };
  });
}

function detailOf(entry: RecordingRow, status: RecordingStatus): string {
  switch (status) {
    case 'SCHEDULED':
      return 'Scheduled';
    case 'RECORDING':
      return 'Recording';
    case 'STOPPING':
      return 'Stopping';
    case 'FAILED':
      return 'Failed';
    case 'DONE':
      return `${durationText(entry.startMs, entry.endMs ?? entry.plannedEndMs)} · ${sizeText(entry.sizeBytes)}`;
  }
}

/** Whole minutes, rounded up; captures shorter than a minute say so. */
export function durationText(startMs: number, endMs: number): string {
  const minutes = Math.floor((Math.max(0, endMs - startMs) + MINUTE_MS - 1) / MINUTE_MS);
  return minutes < 1 ? 'under 1 min' : `${minutes} min`;
}

/** The focus id of a library row. */
export function recordingRowId(row: RecordingListRow): string {
  return `recording-${row.entry.id}`;
}

/** "Title · Channel · detail" — the one-line form for a settings-style list. */
export function recordingLabel(row: RecordingListRow): string {
  return `${row.entry.title} · ${row.entry.channelName} · ${row.detailText}`;
}

export { sizeText };
