// Auto-reconnect for dropped live streams (port of Android's
// `EngineReconnector`). While the policy's backoff budget lasts, a retry is
// posted through `schedule` (setTimeout in prod, a capturing list in tests)
// and the engine surfaces Reconnecting; a spent budget surfaces the hard error.
//
// The pending retry is part of the engine's connection state: `reset()` (a
// new load, stop, release or READY) retires it, so a retry armed for one
// stream can never fire on the next one, re-prepare a stopped pipeline or
// touch a released player — the "zap during a reconnect re-buffers the new
// channel" bug from the Android decisions log. Retirement is an epoch check
// inside the posted closure, so the scheduler seam stays a plain post with no
// cancel handle.
import type { EngineState } from './engineState';
import { errorState, reconnecting } from './engineState';
import type { ReconnectPolicy } from './reconnectPolicy';

export type Schedule = (delayMs: number, task: () => void) => void;

/** Displayable cause once a wedged stream spends the retry budget. */
export const STALLED = 'STREAM_STALLED';

export class EngineReconnector {
  /** Bumped by `reset`; a posted retry fires only while its epoch is current. */
  private epoch = 0;

  constructor(
    private readonly policy: ReconnectPolicy,
    private readonly schedule: Schedule,
  ) {}

  /** The epoch the next armed retry will carry (exposed for tests/state). */
  get currentEpoch(): number {
    return this.epoch;
  }

  /** Fresh budget AND no pending retry — every new stream / stop / release / READY. */
  reset(): void {
    this.policy.reset();
    this.epoch += 1;
  }

  /** The state to surface for an error; arms `retry` when the budget allows. */
  onError(message: string, retry: () => void): EngineState {
    return this.arm(message, retry);
  }

  /**
   * A silently wedged stream (stall watchdog, no error event) recovers on the
   * same budget; the caller's `retry` must drop the wedged pipeline first.
   */
  onStall(retry: () => void): EngineState {
    return this.arm(STALLED, retry);
  }

  private arm(message: string, retry: () => void): EngineState {
    const delayMs = this.policy.nextDelayMs();
    if (delayMs === null) return errorState(message);
    const armed = this.epoch;
    this.schedule(delayMs, () => {
      if (armed === this.epoch) retry();
    });
    return reconnecting(this.policy.attempt, armed);
  }
}
