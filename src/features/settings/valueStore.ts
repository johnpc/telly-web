/** A tiny observable value for `useSyncExternalStore` consumers (the controller's state + refresh status). */
export class ValueStore<T> {
  private readonly listeners = new Set<() => void>();

  constructor(private current: T) {}

  get value(): T {
    return this.current;
  }

  set(next: T): void {
    if (next === this.current) return;
    this.current = next;
    this.listeners.forEach((listener) => listener());
  }

  update(change: (current: T) => T): void {
    this.set(change(this.current));
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
