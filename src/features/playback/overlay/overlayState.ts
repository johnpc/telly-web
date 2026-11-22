import { type PlaybackOverlay, NONE } from './playbackOverlay';

export type TimerHandle = ReturnType<typeof setTimeout>;

export interface OverlayTimers {
  set(callback: () => void, ms: number): TimerHandle;
  clear(handle: TimerHandle): void;
}

const defaultTimers: OverlayTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle),
};

/**
 * Holds the active overlay and the auto-hide timer of the transient ones,
 * each with its own timeout (Android `OverlayState`). Written ONLY by
 * `PlaybackCommands`; the timer is injectable so tests use fake time.
 */
export class OverlayState {
  private current: PlaybackOverlay = NONE;
  private hide: { handle: TimerHandle; ms: number } | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly timers: OverlayTimers = defaultTimers) {}

  get value(): PlaybackOverlay {
    return this.current;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Shows a sticky overlay (panel, menus); cancels any auto-hide timer. */
  set(next: PlaybackOverlay): void {
    this.cancel();
    this.publish(next);
  }

  /** Shows `next` and schedules its auto-hide after `timeoutMs`. */
  showAutoHiding(next: PlaybackOverlay, timeoutMs: number): void {
    this.publish(next);
    this.restart(timeoutMs);
  }

  /** Restarts the countdown (D-pad browsing keeps a transient overlay up). */
  keepAlive(): void {
    if (this.hide !== null) this.restart(this.hide.ms);
  }

  /** For owners that end the store's life (tests); the screen never calls it — React StrictMode re-runs effect cleanups on a live store. */
  dispose(): void {
    this.cancel();
  }

  private restart(ms: number): void {
    this.cancel();
    const shown = this.current;
    const handle = this.timers.set(() => {
      this.hide = null;
      if (this.current === shown) this.publish(NONE);
    }, ms);
    this.hide = { handle, ms };
  }

  private cancel(): void {
    if (this.hide !== null) this.timers.clear(this.hide.handle);
    this.hide = null;
  }

  private publish(next: PlaybackOverlay): void {
    this.current = next;
    for (const listener of this.listeners) listener();
  }
}
