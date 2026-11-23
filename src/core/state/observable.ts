/**
 * Minimal external-store base for logic classes: React reads them through
 * `useSyncExternalStore` (the Kotlin `StateFlow` equivalent). `version`
 * changes on every notify so a snapshot getter is one number.
 */
export class Observable {
  private readonly listeners = new Set<() => void>();
  private count = 0;

  /** Monotonic change counter; a cheap `useSyncExternalStore` snapshot. */
  get version(): number {
    return this.count;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  protected notify(): void {
    this.count += 1;
    for (const listener of [...this.listeners]) listener();
  }
}
