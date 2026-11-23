// React bindings for the engine seam. `useEngineState` / `useEnginePaused`
// read the engine's external store; `useLeasedEngine` holds a lease on the
// shared live-TV engine for the component's subscribed lifetime (the port of
// Android's `rememberLeasedEngine`). The lease lives inside the
// `useSyncExternalStore` subscription so the guide preview and fullscreen
// overlap their leases across the route change and the stream survives it.
import { useMemo, useSyncExternalStore } from 'react';
import type { PlayerEngine } from './PlayerEngine';
import type { EngineState } from './engineState';
import { SharedResource } from '@/core/state/sharedResource';
import { SubscriberLease } from '@/core/state/subscriberLease';
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

/** One engine lease per subscriber set: acquired on the first subscribe, released on the last unsubscribe. */
export class LeaseHolder<T extends Releasable> {
  private readonly leases: SubscriberLease<Lease<T>>;

  constructor(engines: SharedPlayerEngine<T>) {
    this.leases = new SubscriberLease(
      new SharedResource(
        () => engines.acquire(),
        (lease) => lease.release(),
      ),
    );
  }

  readonly subscribe = (listener: () => void): (() => void) => this.leases.subscribe(listener);

  readonly getSnapshot = (): T | null => this.leases.getSnapshot()?.engine ?? null;
}

/** The shared engine, or null on the very first render before the lease is taken. */
export function useLeasedEngine<T extends Releasable>(engines: SharedPlayerEngine<T>): T | null {
  const holder = useMemo(() => new LeaseHolder(engines), [engines]);
  return useSyncExternalStore(holder.subscribe, holder.getSnapshot, () => null);
}
