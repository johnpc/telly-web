import type { OverlayTimers, TimerHandle } from '../overlay/overlayState';

/**
 * Direct channel entry (ux-spec §3.3): typed digits accumulate in a small
 * overlay; after a ~2 s pause, on OK, or at four digits the number commits
 * and the channel with that number tunes. BACK cancels. Timers are
 * injectable so tests use fake time.
 */
// @stateMachine('Number entry')
export type NumberEntryState = { kind: 'Idle' } | { kind: 'Entering'; digits: string; timer: TimerHandle };

export const NUMBER_ENTRY_TIMEOUT_MS = 2_000;
export const MAX_DIGITS = 4;

const defaultTimers: OverlayTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle),
};

export class NumberEntry {
  private state: NumberEntryState = { kind: 'Idle' };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly onCommit: (number: number) => void,
    private readonly timeoutMs: number = NUMBER_ENTRY_TIMEOUT_MS,
    private readonly timers: OverlayTimers = defaultTimers,
  ) {}

  /** The digits typed so far, or null while idle. */
  get digits(): string | null {
    return this.state.kind === 'Entering' ? this.state.digits : null;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  push(digit: number): void {
    const digits = `${this.digits ?? ''}${digit}`;
    this.clearTimer();
    if (digits.length >= MAX_DIGITS) return this.finish(digits);
    const timer = this.timers.set(() => this.commit(), this.timeoutMs);
    this.set({ kind: 'Entering', digits, timer });
  }

  /** OK: tune the number typed so far. */
  commit(): void {
    const digits = this.digits;
    if (digits !== null) this.finish(digits);
  }

  /** BACK: forget the entry without tuning. */
  cancel(): void {
    this.clearTimer();
    this.set({ kind: 'Idle' });
  }

  private finish(digits: string): void {
    this.cancel();
    this.onCommit(Number(digits));
  }

  private clearTimer(): void {
    if (this.state.kind === 'Entering') this.timers.clear(this.state.timer);
  }

  private set(next: NumberEntryState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}
