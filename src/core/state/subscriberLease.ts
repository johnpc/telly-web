import type { SharedResource } from './sharedResource';

/**
 * A `useSyncExternalStore` source over a `SharedResource`: every subscriber
 * holds one lease for exactly its subscription (acquired on subscribe,
 * released on unsubscribe), so the resource lives while anyone is mounted
 * and React's StrictMode double-subscribe is just two overlapping leases.
 */
export class SubscriberLease<T> {
  constructor(private readonly shared: SharedResource<T>) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    const unsubscribe = this.shared.subscribe(listener);
    const lease = this.shared.acquire();
    return () => {
      unsubscribe();
      lease.release();
    };
  };

  /** The shared resource, or null before the first subscriber's lease has it. */
  readonly getSnapshot = (): T | null => {
    const s = this.shared.current;
    return s.kind === 'Held' ? s.resource : null;
  };
}
