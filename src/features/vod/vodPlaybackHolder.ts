import { SharedResource } from '@/core/state/sharedResource';
import { SubscriberLease } from '@/core/state/subscriberLease';
import type { VodPlaybackViewModel } from './vodPlaybackViewModel';

/**
 * One ViewModel per subscriber set (the core `Shared resource lease` behind a
 * `useSyncExternalStore` source): built and started on the first subscribe,
 * released on the last unsubscribe — so the screen's own engine lives exactly
 * as long as the screen is on, and React's StrictMode double-subscribe is just
 * two overlapping leases on one visit.
 */
export class VodPlaybackHolder {
  private readonly lease: SubscriberLease<VodPlaybackViewModel>;

  constructor(create: () => VodPlaybackViewModel) {
    this.lease = new SubscriberLease(
      new SharedResource(
        () => {
          const created = create();
          void created.start();
          return created;
        },
        (viewModel) => viewModel.release(),
      ),
    );
  }

  readonly subscribe = (listener: () => void): (() => void) => this.lease.subscribe(listener);

  readonly getSnapshot = (): VodPlaybackViewModel | null => this.lease.getSnapshot();
}
