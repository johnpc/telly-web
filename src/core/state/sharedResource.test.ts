import { describe, expect, it, vi } from 'vitest';
import { SharedResource } from './sharedResource';
import { SubscriberLease } from './subscriberLease';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SharedResource', () => {
  it('synchronous begin: overlapping leases share one build, the last release ends it, a double release is a no-op', () => {
    const end = vi.fn();
    let builds = 0;
    const shared = new SharedResource(() => {
      builds += 1;
      return `r${builds}`;
    }, end);
    const a = shared.acquire();
    const b = shared.acquire();
    expect(a.resource).toBe('r1');
    expect(b.resource).toBe('r1');
    expect(shared.current).toEqual({ kind: 'Held', holders: 2, resource: 'r1' });
    a.release();
    a.release();
    expect(shared.holders).toBe(1);
    expect(end).not.toHaveBeenCalled();
    b.release();
    expect(shared.current).toEqual({ kind: 'Free' });
    expect(end).toHaveBeenCalledWith('r1');
    expect(shared.acquire().resource).toBe('r2');
  });

  it('asynchronous begin: holders join the start in flight; a release during Starting cancels it on arrival', async () => {
    const end = vi.fn();
    const starts: Deferred<string>[] = [];
    const shared = new SharedResource<string>(() => {
      const d = deferred<string>();
      starts.push(d);
      return d.promise;
    }, end);
    const a = shared.acquire();
    const b = shared.acquire();
    expect(a.resource).toBeNull();
    expect(shared.current).toEqual({ kind: 'Starting', holders: 2 });
    a.release();
    b.release();
    expect(shared.current).toEqual({ kind: 'Stopping' });
    const c = shared.acquire();
    expect(shared.current).toEqual({ kind: 'Starting', holders: 1 });
    expect(starts).toHaveLength(1);
    c.release();
    starts[0]?.resolve('ticker');
    await starts[0]?.promise;
    expect(end).toHaveBeenCalledWith('ticker');
    expect(shared.current).toEqual({ kind: 'Free' });
    const d = shared.acquire();
    starts[1]?.resolve('ticker2');
    await starts[1]?.promise;
    expect(shared.current).toEqual({ kind: 'Held', holders: 1, resource: 'ticker2' });
    d.release();
    expect(end).toHaveBeenLastCalledWith('ticker2');
  });

  it('a failed start is reported and leaves the lease Free; releasing a lease from it is harmless', async () => {
    const onError = vi.fn();
    const start = deferred<string>();
    const shared = new SharedResource<string>(
      () => start.promise,
      () => undefined,
      onError,
    );
    const a = shared.acquire();
    start.reject(new Error('no'));
    await start.promise.catch(() => undefined);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(shared.current).toEqual({ kind: 'Free' });
    a.release();
    expect(shared.current).toEqual({ kind: 'Free' });
    expect(
      new SharedResource(
        () => 1,
        () => undefined,
      ).holders,
    ).toBe(0);
  });

  it('notifies subscribers on every transition', () => {
    const shared = new SharedResource(
      () => 1,
      () => undefined,
    );
    const seen: string[] = [];
    shared.subscribe(() => seen.push(shared.current.kind));
    shared.acquire().release();
    expect(seen).toEqual(['Held', 'Free']);
  });
});

describe('SubscriberLease', () => {
  it('leases per subscriber, notifies the subscriber once its resource exists, frees on the last unsubscribe', () => {
    const end = vi.fn();
    const shared = new SharedResource(() => 'vm', end);
    const source = new SubscriberLease(shared);
    expect(source.getSnapshot()).toBeNull();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = source.subscribe(a);
    expect(a).toHaveBeenCalled();
    expect(source.getSnapshot()).toBe('vm');
    const unsubB = source.subscribe(b);
    expect(shared.holders).toBe(2);
    unsubA();
    expect(end).not.toHaveBeenCalled();
    unsubB();
    expect(end).toHaveBeenCalledTimes(1);
    expect(source.getSnapshot()).toBeNull();
  });
});
