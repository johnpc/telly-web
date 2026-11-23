// Refcounted lease over the live-TV engine so the guide preview and the
// fullscreen player hand the SAME stream across their route transition.
// On the web the two screens do NOT overlap (the shell mounts one route at a
// time), so the last external release does not free the engine at once: a
// short GRACE keeps it alive and a new lease inside that window adopts it —
// the stream survives the switch with zero re-tune, exactly what Android's
// overlapping composables give for free. The refcount itself is the core
// `Shared resource lease`. Port of Android's `SharedPlayerEngine`.
import { SharedResource, type ResourceLease } from '@/core/state/sharedResource';

export interface Releasable {
  release(): void;
}

export interface Lease<T extends Releasable> {
  readonly engine: T;
  /** Drops this lease exactly once; further calls are no-ops. */
  release(): void;
}

/** How long a route switch may take before the last release really frees the engine. */
export const RELEASE_GRACE_MS = 400;

// @stateMachine('Engine release grace')
/** None · Pending(lease, timer): the engine is held by nobody but the grace timer. */
type Grace<T> =
  { kind: 'None' } | { kind: 'Pending'; lease: ResourceLease<T>; timer: ReturnType<typeof setTimeout> };

export class SharedPlayerEngine<T extends Releasable> {
  private readonly shared: SharedResource<T>;
  private grace: Grace<T> = { kind: 'None' };

  constructor(
    build: () => T,
    private readonly graceMs: number = RELEASE_GRACE_MS,
  ) {
    this.shared = new SharedResource(build, (engine) => engine.release());
  }

  /** Live external leases outstanding (the grace lease does not count). */
  get leaseCount(): number {
    return this.shared.holders - (this.grace.kind === 'Pending' ? 1 : 0);
  }

  /** The live engine, built on the first lease of a cycle (or adopted from the grace window). */
  acquire(): Lease<T> {
    const lease = this.shared.acquire();
    this.cancelGrace();
    const engine = lease.resource;
    if (engine === null) throw new Error('engine builds are synchronous');
    let open = true;
    return {
      engine,
      release: () => {
        if (!open) return;
        open = false;
        if (this.leaseCount === 1) this.armGrace();
        lease.release();
      },
    };
  }

  /** The last external lease is leaving: hold the engine for `graceMs` in case a screen takes over. */
  private armGrace(): void {
    if (this.grace.kind === 'Pending' || this.graceMs <= 0) return;
    const lease = this.shared.acquire();
    const timer = setTimeout(() => {
      this.grace = { kind: 'None' };
      lease.release();
    }, this.graceMs);
    this.grace = { kind: 'Pending', lease, timer };
  }

  private cancelGrace(): void {
    if (this.grace.kind !== 'Pending') return;
    clearTimeout(this.grace.timer);
    const { lease } = this.grace;
    this.grace = { kind: 'None' };
    lease.release();
  }
}
