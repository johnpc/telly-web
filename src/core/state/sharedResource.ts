import { Observable } from './observable';

// @stateMachine('Shared resource lease')
/**
 * THE refcounted lease: one resource (engine, ticker, scheduler, backup
 * watcher) shared by every holder, built on the first acquire and ended by
 * the last release. `begin` may be asynchronous:
 *
 *   Free ── acquire ──▶ Starting(holders) ── begin settles ──▶ Held(holders, resource)
 *   Starting ── last release ──▶ Stopping ── begin settles ──▶ end(resource) → Free
 *   Stopping ── acquire ──▶ Starting(1)   (adopts the start in flight: never two)
 *   Held ── last release ──▶ end(resource) → Free
 *
 * A lease releases exactly once (further calls are no-ops), so the holder
 * count can never go negative, and a release that lands while the start is
 * still in flight cancels it instead of leaking a running resource.
 */
export type SharedState<T> =
  | { readonly kind: 'Free' }
  | { readonly kind: 'Starting'; readonly holders: number }
  | { readonly kind: 'Held'; readonly holders: number; readonly resource: T }
  | { readonly kind: 'Stopping' };

export interface ResourceLease<T> {
  /** The resource when `begin` is synchronous; null while an asynchronous start is in flight. */
  readonly resource: T | null;
  /** Drops this lease exactly once; further calls are no-ops. */
  release(): void;
}

const FREE = { kind: 'Free' } as const;
const STOPPING = { kind: 'Stopping' } as const;

/** One more holder; null when the resource must be begun first (Free). */
function joined<T>(s: SharedState<T>): SharedState<T> | null {
  if (s.kind === 'Held' || s.kind === 'Starting') return { ...s, holders: s.holders + 1 };
  return s.kind === 'Stopping' ? { kind: 'Starting', holders: 1 } : null;
}

type Counted<T> = Extract<SharedState<T>, { holders: number }>;

function fewer<T>(s: Counted<T>, whenLast: SharedState<T>): SharedState<T> {
  return s.holders > 1 ? { ...s, holders: s.holders - 1 } : whenLast;
}

/** One holder fewer; the last one frees a held resource or cancels a start in flight. */
function left<T>(s: SharedState<T>): SharedState<T> {
  if (s.kind === 'Held') return fewer(s, FREE);
  return s.kind === 'Starting' ? fewer(s, STOPPING) : s;
}

export class SharedResource<T> extends Observable {
  private state: SharedState<T> = FREE;

  constructor(
    private readonly begin: () => T | Promise<T>,
    private readonly end: (resource: T) => void,
    private readonly onError: (error: unknown) => void = (error) =>
      console.warn('shared resource failed to start', error),
  ) {
    super();
  }

  get current(): SharedState<T> {
    return this.state;
  }

  /** Live leases outstanding (0 = nothing held or wanted). */
  get holders(): number {
    const s = this.state;
    return s.kind === 'Held' || s.kind === 'Starting' ? s.holders : 0;
  }

  acquire(): ResourceLease<T> {
    this.join();
    const s = this.state;
    let open = true;
    return {
      resource: s.kind === 'Held' ? s.resource : null,
      release: () => {
        if (!open) return;
        open = false;
        this.leave();
      },
    };
  }

  private join(): void {
    const next = joined(this.state);
    if (next !== null) return this.set(next);
    const started = this.begin();
    if (!(started instanceof Promise)) return this.set({ kind: 'Held', holders: 1, resource: started });
    this.set({ kind: 'Starting', holders: 1 });
    started.then(
      (resource) => this.arrived(resource),
      (error: unknown) => this.failed(error),
    );
  }

  private leave(): void {
    const s = this.state;
    this.set(left(s));
    if (s.kind === 'Held' && s.holders === 1) this.end(s.resource);
  }

  private arrived(resource: T): void {
    const s = this.state;
    if (s.kind === 'Starting') return this.set({ kind: 'Held', holders: s.holders, resource });
    this.set(FREE);
    this.end(resource);
  }

  private failed(error: unknown): void {
    this.onError(error);
    this.set(FREE);
  }

  private set(next: SharedState<T>): void {
    if (next === this.state) return;
    this.state = next;
    this.notify();
  }
}
