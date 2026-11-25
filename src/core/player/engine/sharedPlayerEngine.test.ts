import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedPlayerEngine } from './sharedPlayerEngine';

class FakeEngine {
  released = false;
  release(): void {
    this.released = true;
  }
}

describe('SharedPlayerEngine', () => {
  let builds: number;
  let shared: SharedPlayerEngine<FakeEngine>;

  beforeEach(() => {
    vi.useFakeTimers();
    builds = 0;
    shared = new SharedPlayerEngine(() => {
      builds += 1;
      return new FakeEngine();
    });
  });
  afterEach(() => vi.useRealTimers());

  it('a route switch (release, then acquire within the grace) keeps the same engine', () => {
    const outgoing = shared.acquire();
    outgoing.release();
    expect(outgoing.engine.released).toBe(false);
    expect(shared.leaseCount).toBe(0);
    vi.advanceTimersByTime(100);
    const incoming = shared.acquire();
    expect(incoming.engine).toBe(outgoing.engine);
    expect(builds).toBe(1);
    vi.advanceTimersByTime(10_000);
    expect(incoming.engine.released).toBe(false);
  });

  it('nobody taking over within the grace frees the engine', () => {
    const only = shared.acquire();
    only.release();
    vi.advanceTimersByTime(400);
    expect(only.engine.released).toBe(true);
    expect(shared.acquire().engine).not.toBe(only.engine);
    expect(builds).toBe(2);
  });

  it('overlapping leases share one engine build', () => {
    const first = shared.acquire();
    const second = shared.acquire();
    expect(first.engine).toBe(second.engine);
    expect(builds).toBe(1);
    expect(shared.leaseCount).toBe(2);
  });

  it('the hand-over keeps the engine alive: incoming acquires before outgoing releases', () => {
    const outgoing = shared.acquire();
    shared.acquire();
    outgoing.release();
    expect(outgoing.engine.released).toBe(false);
    expect(shared.leaseCount).toBe(1);
  });

  it('the last release frees the engine and the next acquire rebuilds', () => {
    const first = shared.acquire();
    first.release();
    vi.advanceTimersByTime(400);
    expect(first.engine.released).toBe(true);
    expect(shared.acquire().engine).not.toBe(first.engine);
    expect(builds).toBe(2);
  });

  it('releasing one lease twice never underflows the count', () => {
    const a = shared.acquire();
    const b = shared.acquire();
    a.release();
    a.release();
    expect(shared.leaseCount).toBe(1);
    expect(b.engine.released).toBe(false);
    b.release();
    vi.advanceTimersByTime(400);
    expect(b.engine.released).toBe(true);
    expect(shared.leaseCount).toBe(0);
  });
});
