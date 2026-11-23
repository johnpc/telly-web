import { Observable } from '@/core/state/observable';
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

// @stateMachine('Recordings library')
/**
 * The Recordings library screen's mode (Android `RecordingsViewModel`): ONE
 * value — Browsing · Confirming(stop/cancel/delete) · Stopping(row) ·
 * Playing(row). `Stopping` is the accepted Stop until the center reports the
 * capture closed: an immediate OK on THAT row plays it instead of re-asking,
 * even before the store's STOPPING/DONE status has reached the list (the
 * window Android's optimistic `stoppedIds` copy papered over).
 */
export type LibraryMode =
  | { readonly kind: 'Browsing' }
  | { readonly kind: 'Confirming'; readonly confirm: RecordingsConfirm }
  | { readonly kind: 'Stopping'; readonly row: RecordingListRow }
  | { readonly kind: 'Playing'; readonly row: RecordingListRow };

const BROWSING: LibraryMode = { kind: 'Browsing' };

/** What OK asks for a row of this status. */
function confirmFor(row: RecordingListRow): RecordingsConfirm | null {
  const status: RecordingStatus = row.status;
  if (status === 'DONE' || status === 'STOPPING') return null;
  if (status === 'RECORDING') return { kind: 'Stop', row };
  return status === 'SCHEDULED' ? { kind: 'Cancel', row } : { kind: 'Delete', row };
}

export class RecordingsLibrary extends Observable {
  private current: LibraryMode = BROWSING;

  constructor(private readonly center: Pick<RecordingCenter, 'stop' | 'delete'>) {
    super();
  }

  get mode(): LibraryMode {
    return this.current;
  }

  get confirm(): RecordingsConfirm | null {
    return this.current.kind === 'Confirming' ? this.current.confirm : null;
  }

  get playing(): RecordingListRow | null {
    return this.current.kind === 'Playing' ? this.current.row : null;
  }

  /** OK: play DONE (and stopping) captures, confirm stop/cancel/delete for the rest. */
  onRowClick(row: RecordingListRow): void {
    const confirm = this.isStopping(row.entry.id) ? null : confirmFor(row);
    this.set(confirm === null ? { kind: 'Playing', row } : { kind: 'Confirming', confirm });
  }

  /** Long-OK on any row: delete (file + row) after the confirm. */
  onRowLongClick(row: RecordingListRow): void {
    this.set({ kind: 'Confirming', confirm: { kind: 'Delete', row } });
  }

  /** The confirm's affirmative action; a Stop holds `Stopping(row)` until the capture has closed. */
  accept(): void {
    if (this.current.kind !== 'Confirming') return;
    const { confirm } = this.current;
    if (confirm.kind === 'Stop') return this.beginStop(confirm.row);
    this.set(BROWSING);
    void this.center.delete(confirm.row.entry.id);
  }

  private beginStop(row: RecordingListRow): void {
    const id = row.entry.id;
    this.set({ kind: 'Stopping', row });
    void this.center.stop(id).then(() => {
      if (this.isStopping(id)) this.set(BROWSING);
    });
  }

  dismissConfirm(): void {
    if (this.current.kind === 'Confirming') this.set(BROWSING);
  }

  /** BACK from the capture player returns to the list. */
  stopPlaying(): void {
    if (this.current.kind === 'Playing') this.set(BROWSING);
  }

  private isStopping(id: number): boolean {
    return this.current.kind === 'Stopping' && this.current.row.entry.id === id;
  }

  private set(next: LibraryMode): void {
    this.current = next;
    this.notify();
  }
}
