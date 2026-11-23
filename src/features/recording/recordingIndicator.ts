import { keyOf } from '@/core/db/channelIdentity';
import type { ChannelRow, RecordingRow } from '@/core/db/types';

/**
 * Derives the transport record dot's live state (Android `RecordingIndicator`):
 * red while the CURRENT channel has an in-progress recording, grey otherwise.
 * Pure derivation over the DVR library feed — no clock, no database.
 */
export function isRecording(
  recordings: readonly RecordingRow[],
  channel: Pick<ChannelRow, 'tvgId' | 'streamUrl' | 'name'> | null,
): boolean {
  if (channel === null) return false;
  const key = keyOf(channel);
  return recordings.some((row) => row.status === 'RECORDING' && row.channelKey === key);
}

/** The dot's accessible name, which the acceptance harness reads too. */
export const RECORD_DOT_LABELS = { idle: 'Record', recording: 'Recording' } as const;

export function recordDotLabel(recording: boolean): string {
  return recording ? RECORD_DOT_LABELS.recording : RECORD_DOT_LABELS.idle;
}
