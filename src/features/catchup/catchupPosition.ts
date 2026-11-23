/** The one engine read the transport readout samples. */
export type PositionSource = Pick<{ positionMs: number }, 'positionMs'>;

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
