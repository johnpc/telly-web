// @stateMachine('Reconnect budget')
//
// Live-stream auto-reconnect budget, ported verbatim from Android's
// `ReconnectPolicy`: on each player error the engine asks for `nextDelayMs()`
// — 1 s, 2 s, 4 s, 8 s… doubling and capped at `maxDelayMs` — and re-prepares
// the stream after it. Once `maxAttempts` retries are spent the budget
// returns null and the engine surfaces a hard error. A successful playback
// calls `reset()`, so a stream that drops again hours later gets a fresh
// budget. Pure logic: no clock, the engine owns the scheduling.

export interface ReconnectPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export const DEFAULT_MAX_ATTEMPTS = 6;
export const DEFAULT_BASE_DELAY_MS = 1_000;
export const DEFAULT_MAX_DELAY_MS = 30_000;

export class ReconnectPolicy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private spent = 0;

  constructor(options: ReconnectPolicyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  }

  /** Retries spent so far in this budget (0..maxAttempts). */
  get attempt(): number {
    return this.spent;
  }

  /** Next backoff delay in ms, or null once the retry budget is spent. */
  nextDelayMs(): number | null {
    if (this.spent >= this.maxAttempts) return null;
    const delay = Math.min(this.baseDelayMs * 2 ** this.spent, this.maxDelayMs);
    this.spent += 1;
    return delay;
  }

  /** Clears the spent attempts after a successful (re)connect. */
  reset(): void {
    this.spent = 0;
  }
}
