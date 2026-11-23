// Refcounted lease over the live-TV engine so the guide preview and the
// fullscreen player hand the SAME stream across their route transition —
// both screens are mounted while the transition runs, so the incoming lease
// overlaps the outgoing one and the pipeline never tears down mid-switch.
// Built lazily on the first acquire; the last release frees the engine (and
// a changed Playback setting applies on the next build), so multiview, VOD
// and recordings keep their own engines untouched. The refcount itself is
// the core `Shared resource lease`.
// Port of Android's `SharedPlayerEngine` + `PlaybackDeps.engines`.
import { SharedResource } from '@/core/state/sharedResource';

export interface Releasable {
  release(): void;
}

export interface Lease<T extends Releasable> {
  readonly engine: T;
  /** Drops this lease exactly once; further calls are no-ops. */
  release(): void;
}

export class SharedPlayerEngine<T extends Releasable> {
  private readonly shared: SharedResource<T>;

  constructor(build: () => T) {
    this.shared = new SharedResource(build, (engine) => engine.release());
  }

  /** Live leases outstanding (0 = engine freed). */
  get leaseCount(): number {
    return this.shared.holders;
  }

  /** The live engine, built on the first lease of a cycle. */
  acquire(): Lease<T> {
    const lease = this.shared.acquire();
    const engine = lease.resource;
    if (engine === null) throw new Error('engine builds are synchronous');
    return { engine, release: lease.release };
  }
}
