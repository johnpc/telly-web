/** The one engine read the transport readout samples. */
export type PositionSource = Pick<{ positionMs: number }, 'positionMs'>;

/**
 * Web deviation: a seek issued before the archive's media is attached is
 * lost (the `<video>` has no pipeline yet and the engine starts at 0), so
 * the target is latched and replayed once the engine reports Playing.
 */
export class PendingSeek {
  private targetMs: number | null = null;

  arm(positionMs: number): void {
    this.targetMs = positionMs;
  }

  clear(): void {
    this.targetMs = null;
  }

  /** Re-issues the latched seek; true when one was pending. */
  replay(engine: { seekTo(positionMs: number): void }): boolean {
    if (this.targetMs === null) return false;
    engine.seekTo(this.targetMs);
    this.targetMs = null;
    return true;
  }
}

/**
 * The transport's position readout (Android `CatchupPosition`). Sampling is
 * DRIVEN by the overlay (a per-second UI ticker while it is visible) and by
 * explicit seek updates, so the logic layer never spins its own clock loop.
 */
export class PositionStore {
  private positionMs = 0;
  private readonly listeners = new Set<() => void>();

  get value(): number {
    return this.positionMs;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): number => this.positionMs;

  reset(): void {
    this.set(0);
  }

  refresh(engine: PositionSource): void {
    this.set(engine.positionMs);
  }

  set(positionMs: number): void {
    if (positionMs === this.positionMs) return;
    this.positionMs = positionMs;
    for (const listener of this.listeners) listener();
  }
}
