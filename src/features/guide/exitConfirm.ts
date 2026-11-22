import type { HoldTimers, TimerHandle } from '@/core/input/holdKeyDetector';
import { Observable } from './observable';

export const EXIT_WINDOW_MS = 5_000;
export const EXIT_MESSAGE = 'Press BACK again to exit';

const defaultTimers: HoldTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle),
};

/** Idle (no toast) · Armed (toast showing = the exit window). */
export type ExitState = { kind: 'Idle' } | { kind: 'Armed'; timer: TimerHandle };

/**
 * "Confirm exit by second press Back" at the guide root (Android
 * `ExitConfirm`): the first BACK arms a window and shows the warning toast,
 * a second BACK inside the window exits. The toast IS the arming, so the
 * window the user sees and the one the policy honors can never drift.
 */
// @stateMachine('Exit confirm')
export class ExitConfirm extends Observable {
  private state: ExitState = { kind: 'Idle' };

  constructor(private readonly timers: HoldTimers = defaultTimers) {
    super();
  }

  /** True while the warning toast should render. */
  get warning(): boolean {
    return this.state.kind === 'Armed';
  }

  /** True = exit now (second BACK inside the window); false = warn + arm. */
  onBack(): boolean {
    if (this.state.kind === 'Armed') return true;
    const timer = this.timers.set(() => this.disarm(), EXIT_WINDOW_MS);
    this.state = { kind: 'Armed', timer };
    this.notify();
    return false;
  }

  /** The screen unmounted: drop the pending timer. */
  dispose(): void {
    if (this.state.kind === 'Armed') this.timers.clear(this.state.timer);
    this.state = { kind: 'Idle' };
  }

  private disarm(): void {
    this.state = { kind: 'Idle' };
    this.notify();
  }
}
