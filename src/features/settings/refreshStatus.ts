// Transient state of the manual "Update ..." action rows (Update playlist /
// Update all playlists / Update EPG): the row whose work is in flight, then
// the completion message shown briefly once it lands (Android `RefreshStatus`).
// @stateMachine('Manual refresh')
import { ValueStore } from './valueStore';

export type RefreshStatus =
  { kind: 'idle' } | { kind: 'busy'; rowId: string } | { kind: 'message'; text: string };

export const IDLE: RefreshStatus = { kind: 'idle' };

/** How long a refresh completion message stays on screen. */
export const REFRESH_MESSAGE_MS = 4_000;

export interface RefreshTimers {
  set(callback: () => void, ms: number): void;
}

const defaultTimers: RefreshTimers = { set: (callback, ms) => void setTimeout(callback, ms) };

/**
 * Runs one manual refresh action: marks its row busy (the sheet renders a
 * spinner), runs the work, then shows its completion message and clears it
 * after a beat. One refresh at a time — activations while busy are ignored.
 */
export class RefreshRunner {
  readonly status = new ValueStore<RefreshStatus>(IDLE);

  constructor(
    private readonly timers: RefreshTimers = defaultTimers,
    private readonly messageMs: number = REFRESH_MESSAGE_MS,
  ) {}

  get busyRowId(): string | null {
    const current = this.status.value;
    return current.kind === 'busy' ? current.rowId : null;
  }

  /** Starts `work` for `rowId`; resolves when the message is showing (or immediately when busy). */
  async run(rowId: string, work: () => Promise<string>): Promise<void> {
    if (this.status.value.kind === 'busy') return;
    this.status.set({ kind: 'busy', rowId });
    const done: RefreshStatus = { kind: 'message', text: await messageOf(work) };
    this.status.set(done);
    this.timers.set(() => {
      if (this.status.value === done) this.status.set(IDLE);
    }, this.messageMs);
  }
}

/** Defensive: a throwing refresher must never strand the spinner. */
async function messageOf(work: () => Promise<string>): Promise<string> {
  try {
    return await work();
  } catch {
    return 'Update failed';
  }
}
