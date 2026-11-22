// Port of Android `Navigator.kt`: a hand-rolled typed back stack. The UI
// renders `current`; BACK pops one entry. `window.history` is kept in step so
// a TV browser's hardware BACK (which fires `popstate`) pops the same stack.
// @stateMachine('Navigator')
import type { Route } from './routes';

/** The slice of `window.history` the navigator uses; tests pass a fake. */
export interface HistoryPort {
  pushState(state: unknown, unused: string): void;
  replaceState(state: unknown, unused: string): void;
  back(): void;
}

/** Stamped on every history entry we create: how deep the stack was at that entry. */
interface HistoryMark {
  tellyDepth: number;
}

function mark(depth: number): HistoryMark {
  return { tellyDepth: depth };
}

/** Depth stamped on a `popstate` state; entries we did not create count as the root. */
export function depthOf(state: unknown): number {
  if (typeof state !== 'object' || state === null || !('tellyDepth' in state)) return 1;
  return typeof state.tellyDepth === 'number' ? state.tellyDepth : 1;
}

export class Navigator {
  private routes: readonly [Route, ...Route[]];
  private readonly listeners = new Set<() => void>();

  constructor(
    start: Route = { kind: 'Welcome' },
    private readonly history: HistoryPort | null = null,
  ) {
    this.routes = [start];
    this.history?.replaceState(mark(1), '');
  }

  /** The full back stack, oldest first; never empty. */
  get stack(): readonly Route[] {
    return this.routes;
  }

  /** The route currently on screen. */
  get current(): Route {
    return this.routes[this.routes.length - 1] ?? this.routes[0];
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  push(route: Route): void {
    this.routes = [...this.routes, route];
    this.history?.pushState(mark(this.routes.length), '');
    this.notify();
  }

  /** Pops one entry. Returns false (and does nothing) at the root. */
  pop(): boolean {
    if (this.routes.length <= 1) return false;
    this.trimTo(this.routes.length - 1);
    // The resulting popstate arrives stamped with the new depth, so onPopState is a no-op.
    this.history?.back();
    return true;
  }

  /** Clears history and makes `route` the new root (e.g. after onboarding). */
  replaceAll(route: Route): void {
    this.routes = [route];
    this.history?.replaceState(mark(1), '');
    this.notify();
  }

  /** `popstate` arrived: the browser moved to an entry stamped with `state`; trim the stack to match. */
  onPopState(state: unknown): void {
    const depth = depthOf(state);
    if (depth < this.routes.length) this.trimTo(depth);
  }

  private trimTo(depth: number): void {
    const [root, ...rest] = this.routes;
    this.routes = [root, ...rest.slice(0, depth - 1)];
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
