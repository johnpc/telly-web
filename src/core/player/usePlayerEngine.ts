// React bindings for the engine seam. `useEngineState` / `useEnginePaused`
// read the engine's external store; `useLeasedEngine` holds a lease on the
// shared live-TV engine for the component's subscribed lifetime (the port of
// Android's `rememberLeasedEngine`). The lease lives inside the
// `useSyncExternalStore` subscription so the guide preview and fullscreen
// overlap their leases across the route change and the stream survives it.
import { useMemo, useSyncExternalStore } from 'react';
import type { PlayerEngine } from './PlayerEngine';
import type { EngineState } from './engineState';
import type { Lease, Releasable, SharedPlayerEngine } from './sharedPlayerEngine';

export function useEngineState(engine: PlayerEngine): EngineState {
  return useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.state,
    () => engine.state,
  );
}

export function useEnginePaused(engine: PlayerEngine): boolean {
  return useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.paused,
    () => engine.paused,
  );
}

export interface PlayerEngineView {
  engine: PlayerEngine;
  state: EngineState;
  paused: boolean;
}

export function usePlayerEngine(engine: PlayerEngine): PlayerEngineView {
  return { engine, state: useEngineState(engine), paused: useEnginePaused(engine) };
}

/** One lease per subscriber set: acquired on first subscribe, released on last unsubscribe. */
export class LeaseHolder<T extends Releasable> {
  private lease: Lease<T> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly engines: SharedPlayerEngine<T>) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.lease === null) this.take();
    return () => this.drop(listener);
  };

  readonly getSnapshot = (): T | null => this.lease?.engine ?? null;

  private take(): void {
    this.lease = this.engines.acquire();
    for (const notify of this.listeners) notify();
  }

  private drop(listener: () => void): void {
    this.listeners.delete(listener);
    if (this.listeners.size > 0) return;
    this.lease?.release();
    this.lease = null;
  }
}

/** The shared engine, or null on the very first render before the lease is taken. */
export function useLeasedEngine<T extends Releasable>(engines: SharedPlayerEngine<T>): T | null {
  const holder = useMemo(() => new LeaseHolder(engines), [engines]);
  return useSyncExternalStore(holder.subscribe, holder.getSnapshot, () => null);
}
