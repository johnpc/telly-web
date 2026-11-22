/**
 * Minimal `useSyncExternalStore`-shaped notifier: a monotonically increasing
 * version readers re-render on. Used for the overlay's "now" instant (re-seeded
 * when an overlay opens) and for engine facts that do not emit themselves
 * (the audio-sync offset).
 */
export class Signal {
  private version = 0;
  private readonly listeners = new Set<() => void>();

  get value(): number {
    return this.version;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): number => this.version;

  notify(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }
}

/** The overlay's sampled "now": re-seeded from the clock on every `refresh`. */
export class InstantStore {
  private at: number;
  readonly changed = new Signal();

  constructor(private readonly clock: () => number = () => Date.now()) {
    this.at = clock();
  }

  get value(): number {
    return this.at;
  }

  readonly getSnapshot = (): number => this.at;

  refresh(): void {
    this.at = this.clock();
    this.changed.notify();
  }
}
