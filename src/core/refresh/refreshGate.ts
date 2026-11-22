// @stateMachine('Background refresh gate')
/**
 * Runs the app's heavy background refreshes — EPG documents and playlist
 * imports — one at a time, each bounded by `timeoutMs`, and logs every run
 * (port of Android `RefreshGate.kt`). Serializing them keeps the two from
 * contending over IndexedDB transactions; the timeout guarantees a wedged
 * run is abandoned so the next tick retries. JavaScript cannot cancel the
 * abandoned promise: its eventual result is simply ignored.
 */
export type RefreshGateState =
  | { kind: 'Idle' }
  | { kind: 'Running'; name: string; startedAtMs: number }
  | { kind: 'TimedOut'; name: string; abandonedAtMs: number };

export interface RefreshGateOptions {
  clock?: () => number;
  log?: (message: string) => void;
  timeoutMs?: number;
}

/** Far above a full EPG import (~30 s for 20k programmes). */
export const REFRESH_TIMEOUT_MS = 10 * 60 * 1000;

/** Runs faster than this did no network work (nothing was due) and stay unlogged. */
export const QUIET_UNDER_MS = 500;

const TIMED_OUT = Symbol('timed-out');

export class RefreshGate {
  private readonly clock: () => number;
  private readonly log: (message: string) => void;
  private readonly timeoutMs: number;
  private queue: Promise<unknown> = Promise.resolve();
  private current: RefreshGateState = { kind: 'Idle' };

  constructor(options: RefreshGateOptions = {}) {
    this.clock = options.clock ?? ((): number => Date.now());
    this.log = options.log ?? ((): void => undefined);
    this.timeoutMs = options.timeoutMs ?? REFRESH_TIMEOUT_MS;
  }

  get state(): RefreshGateState {
    return this.current;
  }

  /** `block`'s result, or `onTimeout` when it ran past the timeout. Runs queue in call order. */
  run<T>(name: string, onTimeout: T, block: () => Promise<T>): Promise<T> {
    const turn = this.queue.then(() => this.execute(name, onTimeout, block));
    this.queue = turn.catch((): void => undefined);
    return turn;
  }

  private async execute<T>(name: string, onTimeout: T, block: () => Promise<T>): Promise<T> {
    const startedAtMs = this.clock();
    this.current = { kind: 'Running', name, startedAtMs };
    try {
      const result = await this.withDeadline(block);
      const tookMs = this.clock() - startedAtMs;
      if (result === TIMED_OUT) return this.abandon(name, tookMs, onTimeout);
      this.current = { kind: 'Idle' };
      if (tookMs >= QUIET_UNDER_MS) this.log(`${name}: done in ${tookMs}ms`);
      return result;
    } catch (error) {
      this.current = { kind: 'Idle' };
      throw error;
    }
  }

  /** `block`'s result, or the sentinel once the wall-clock timeout fires first. */
  private async withDeadline<T>(block: () => Promise<T>): Promise<T | typeof TIMED_OUT> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), this.timeoutMs);
    });
    try {
      return await Promise.race([block(), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  private abandon<T>(name: string, tookMs: number, onTimeout: T): T {
    this.current = { kind: 'TimedOut', name, abandonedAtMs: this.clock() };
    this.log(`${name}: TIMED OUT after ${tookMs}ms, abandoned`);
    return onTimeout;
  }
}

/** The one gate EPG refreshes and playlist imports share (Android `ServiceLocatorRefresh`). */
export const sharedRefreshGate = new RefreshGate();
