import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BUFFERING, EngineStateStore, type EngineState } from './engineState';
import type { PlayerEngine } from './PlayerEngine';
import { SharedPlayerEngine } from './sharedPlayerEngine';
import {
  LeaseHolder,
  useEnginePaused,
  useEngineState,
  useLeasedEngine,
  usePlayerEngine,
} from './usePlayerEngine';

/** Only the observable slice of the seam the hooks read. */
function fakeEngine(): { engine: PlayerEngine; store: EngineStateStore; setPaused: (v: boolean) => void } {
  const store = new EngineStateStore();
  let paused = false;
  const engine = {
    get state(): EngineState {
      return store.get();
    },
    get paused(): boolean {
      return paused;
    },
    subscribe(listener: () => void): () => void {
      return store.subscribe(listener);
    },
  } as PlayerEngine;
  return {
    engine,
    store,
    setPaused: (v) => {
      paused = v;
      store.set({ kind: 'Error', message: `tick-${String(v)}` });
    },
  };
}

describe('usePlayerEngine hooks', () => {
  it('re-render on state changes through the engine subscription (bound correctly)', () => {
    const { engine, store } = fakeEngine();
    const { result } = renderHook(() => useEngineState(engine));
    expect(result.current.kind).toBe('Idle');
    act(() => store.set(BUFFERING));
    expect(result.current.kind).toBe('Buffering');
  });

  it('usePlayerEngine bundles engine, state and paused', () => {
    const { engine, setPaused } = fakeEngine();
    const { result } = renderHook(() => usePlayerEngine(engine));
    expect(result.current.engine).toBe(engine);
    expect(result.current.paused).toBe(false);
    act(() => setPaused(true));
    expect(result.current.paused).toBe(true);
    const { result: paused } = renderHook(() => useEnginePaused(engine));
    expect(paused.current).toBe(true);
  });
});

class FakeShared {
  released = false;
  release(): void {
    this.released = true;
  }
}

describe('useLeasedEngine', () => {
  it('leases on mount, hands the same engine to an overlapping mount, frees on the last unmount', () => {
    let builds = 0;
    const engines = new SharedPlayerEngine(() => {
      builds += 1;
      return new FakeShared();
    });
    const first = renderHook(() => useLeasedEngine(engines));
    const second = renderHook(() => useLeasedEngine(engines));
    expect(first.result.current).not.toBeNull();
    expect(first.result.current).toBe(second.result.current);
    expect(builds).toBe(1);
    first.unmount();
    expect(second.result.current?.released).toBe(false);
    second.unmount();
    expect(second.result.current?.released).toBe(true);
    expect(engines.leaseCount).toBe(0);
  });

  it('the holder takes exactly one engine lease per subscriber set and notifies each subscriber', () => {
    const engines = new SharedPlayerEngine(() => new FakeShared());
    const holder = new LeaseHolder(engines);
    const a = vi.fn();
    const b = vi.fn();
    expect(holder.getSnapshot()).toBeNull();
    const unsubA = holder.subscribe(a);
    const unsubB = holder.subscribe(b);
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    expect(holder.getSnapshot()).not.toBeNull();
    expect(engines.leaseCount).toBe(1);
    unsubA();
    expect(engines.leaseCount).toBe(1);
    unsubB();
    expect(engines.leaseCount).toBe(0);
    expect(holder.getSnapshot()).toBeNull();
  });
});
