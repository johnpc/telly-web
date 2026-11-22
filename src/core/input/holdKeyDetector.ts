// Port of Android `HoldKeyDetector.kt`. Android fires the hold on the first
// native auto-repeat; the web has no reliable repeat delay, so the hold is a
// timer started on the first key-down instead. Auto-repeat key-downs are ignored.
// @stateMachine('Long-press detection')

export type TimerHandle = ReturnType<typeof setTimeout>;

export interface HoldTimers {
  set(callback: () => void, ms: number): TimerHandle;
  clear(handle: TimerHandle): void;
}

/** Idle → (key-down) Held → (timer) HoldFired → (key-up) Idle; Held → (key-up) Idle emits the tap. */
export type HoldState = { kind: 'Idle' } | { kind: 'Held'; timer: TimerHandle } | { kind: 'HoldFired' };

export const HOLD_MS = 500;

const defaultTimers: HoldTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle),
};

/**
 * Splits a key's down/up events into a tap or a hold. Holding for `holdMs`
 * emits `hold` once (on the timer); releasing earlier emits `tap` on key-up.
 * A null `hold` swallows the long press entirely (the tap still does not fire
 * after a hold). Generic so the key mapping stays unit-testable.
 */
export class HoldKeyDetector<T> {
  private state: HoldState = { kind: 'Idle' };

  constructor(
    private readonly tap: T,
    private readonly hold: T | null,
    private readonly emit: (key: T) => void,
    private readonly holdMs: number = HOLD_MS,
    private readonly timers: HoldTimers = defaultTimers,
  ) {}

  get current(): HoldState['kind'] {
    return this.state.kind;
  }

  /** Key-down. `repeat` is `KeyboardEvent.repeat`; repeats never restart the timer. */
  onDown(repeat: boolean): void {
    if (repeat || this.state.kind !== 'Idle') return;
    const timer = this.timers.set(() => this.fireHold(), this.holdMs);
    this.state = { kind: 'Held', timer };
  }

  /** Key-up: the tap for a short press, nothing after a hold. */
  onUp(): void {
    const previous = this.state;
    this.state = { kind: 'Idle' };
    if (previous.kind !== 'Held') return;
    this.timers.clear(previous.timer);
    this.emit(this.tap);
  }

  /** Forget the current press without emitting (window blur, pointer cancel). */
  cancel(): void {
    if (this.state.kind === 'Held') this.timers.clear(this.state.timer);
    this.state = { kind: 'Idle' };
  }

  private fireHold(): void {
    this.state = { kind: 'HoldFired' };
    if (this.hold !== null) this.emit(this.hold);
  }
}
