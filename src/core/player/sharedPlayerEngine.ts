// Refcounted lease over the live-TV engine so the guide preview and the
// fullscreen player hand the SAME stream across their route transition —
// both screens are mounted while the transition runs, so the incoming lease
// overlaps the outgoing one and the pipeline never tears down mid-switch.
// Built lazily on the first acquire; the last release frees the engine (and
// a changed Playback setting applies on the next build), so multiview, VOD
// and recordings keep their own engines untouched.
// Port of Android's `SharedPlayerEngine` + `PlaybackDeps.engines`.

export interface Releasable {
  release(): void;
}

export interface Lease<T extends Releasable> {
  readonly engine: T;
  /** Drops this lease exactly once; further calls are no-ops. */
  release(): void;
}

export class SharedPlayerEngine<T extends Releasable> {
  private engine: T | null = null;
  private leases = 0;

  constructor(private readonly build: () => T) {}

  /** Live leases outstanding (0 = engine freed). */
  get leaseCount(): number {
    return this.leases;
  }

  /** The live engine, built on the first lease of a cycle. */
  acquire(): Lease<T> {
    this.leases += 1;
    const engine = this.engine ?? this.build();
    this.engine = engine;
    let open = true;
    return {
      engine,
      release: () => {
        if (!open) return;
        open = false;
        this.releaseOne();
      },
    };
  }

  /** Drops one lease; the last one releases the underlying engine. */
  private releaseOne(): void {
    if (this.leases === 0) return;
    this.leases -= 1;
    if (this.leases > 0) return;
    this.engine?.release();
    this.engine = null;
  }
}
