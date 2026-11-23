import { Observable } from '@/features/guide/observable';
import type { RecordingCenter } from './recordingCenter';
import type { RecordingListRow } from './recordingRows';
import type { RecordingStatus } from './recordingStatus';

/** What OK / long-OK on a library row asks the user to confirm (Android `RecordingsConfirm`). */
export type RecordingsConfirm =
  /** OK on an in-progress row: stop it (stays in the library as DONE). */
  | { kind: 'Stop'; row: RecordingListRow }
  /** OK on a SCHEDULED row: cancel it (row removed). */
  | { kind: 'Cancel'; row: RecordingListRow }
  /** Long-OK on any row (and OK on FAILED): delete file + row. */
  | { kind: 'Delete'; row: RecordingListRow };

/** The GuidedStep copy per confirm: question title, body line, the primary action's label. */
export function confirmCopy(confirm: RecordingsConfirm): { title: string; body: string; primary: string } {
  const title = confirm.row.entry.title;
  switch (confirm.kind) {
    case 'Stop':
      return {
        title: 'Stop recording?',
        body: `"${title}" will stop and stay in the library`,
        primary: 'Stop',
      };
    case 'Cancel':
      return {
        title: 'Cancel scheduled recording?',
        body: `"${title}" will not be recorded`,
        primary: 'Remove',
      };
    case 'Delete':
      return {
        title: 'Delete recording?',
        body: `"${title}" and its file will be deleted`,
        primary: 'Delete',
      };
  }
}

/** "Stop recording?" behind a second Record on a channel that is already being captured (sheet hosts). */
export function stopConfirmCopy(channelName: string): { title: string; body: string; primary: string } {
  return {
    title: 'Stop recording?',
    body: `The recording of "${channelName}" will stop and stay in the Recordings library`,
    primary: 'Stop',
  };
}

/**
 * The Recordings library screen's state (Android `RecordingsViewModel`): the
 * confirm for stop/cancel/delete and which DONE capture is playing fullscreen.
 * Rows whose Stop was accepted count as stopped the moment the user confirms,
 * even while the capture closes its file — an immediate OK on the row must
 * play the capture, not reopen the stop confirm.
 */
export class RecordingsLibrary extends Observable {
  private stoppedIds = new Set<number>();
  private pending: RecordingsConfirm | null = null;
  private playingRow: RecordingListRow | null = null;

  constructor(private readonly center: Pick<RecordingCenter, 'stop' | 'delete'>) {
    super();
  }

  get confirm(): RecordingsConfirm | null {
    return this.pending;
  }

  get playing(): RecordingListRow | null {
    return this.playingRow;
  }

  /** The optimistic "stopped" marks live only until the row shows finalized. */
  retainStopped(rows: readonly RecordingListRow[]): void {
    this.stoppedIds = new Set(
      [...this.stoppedIds].filter((id) =>
        rows.some((row) => row.entry.id === id && row.status === 'RECORDING'),
      ),
    );
  }

  /** OK: play DONE captures, confirm stop/cancel/delete for the rest. */
  onRowClick(row: RecordingListRow): void {
    const status: RecordingStatus = this.stoppedIds.has(row.entry.id) ? 'DONE' : row.status;
    if (status === 'DONE') this.playingRow = row;
    else if (status === 'RECORDING') this.pending = { kind: 'Stop', row };
    else if (status === 'SCHEDULED') this.pending = { kind: 'Cancel', row };
    else this.pending = { kind: 'Delete', row };
    this.notify();
  }

  /** Long-OK on any row: delete (file + row) after the confirm. */
  onRowLongClick(row: RecordingListRow): void {
    this.pending = { kind: 'Delete', row };
    this.notify();
  }

  /** The confirm's affirmative action. */
  accept(): void {
    const pending = this.pending;
    if (pending === null) return;
    this.pending = null;
    const id = pending.row.entry.id;
    if (pending.kind === 'Stop') {
      this.stoppedIds.add(id);
      void this.center.stop(id);
    } else void this.center.delete(id);
    this.notify();
  }

  dismissConfirm(): void {
    this.pending = null;
    this.notify();
  }

  /** BACK from the capture player returns to the list. */
  stopPlaying(): void {
    this.playingRow = null;
    this.notify();
  }
}
