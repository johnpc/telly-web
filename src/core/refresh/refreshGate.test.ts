import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUIET_UNDER_MS, REFRESH_TIMEOUT_MS, RefreshGate, sharedRefreshGate } from './refreshGate';

describe('RefreshGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs blocks one at a time, in call order', async () => {
    const gate = new RefreshGate({ clock: () => Date.now() });
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const first = gate.run('first', 'timeout', async () => {
      order.push('first:start');
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      order.push('first:end');
      return 'one';
    });
    const second = gate.run('second', 'timeout', async () => {
      order.push('second');
      return 'two';
    });
    await Promise.resolve();
    expect(gate.state).toMatchObject({ kind: 'Running', name: 'first' });
    expect(order).toEqual(['first:start']);
    releaseFirst();
    expect(await first).toBe('one');
    expect(await second).toBe('two');
    expect(order).toEqual(['first:start', 'first:end', 'second']);
    expect(gate.state).toEqual({ kind: 'Idle' });
  });

  it('abandons a block that runs past the timeout and logs it', async () => {
    const log = vi.fn();
    const gate = new RefreshGate({ clock: () => Date.now(), log, timeoutMs: 1000 });
    const result = gate.run('EPG refresh', [] as number[], () => new Promise<number[]>(() => undefined));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toEqual([]);
    expect(gate.state).toMatchObject({ kind: 'TimedOut', name: 'EPG refresh' });
    expect(log).toHaveBeenCalledWith('EPG refresh: TIMED OUT after 1000ms, abandoned');
    // The gate is free for the next run.
    expect(await gate.run('next', 0, async () => 1)).toBe(1);
  });

  it('logs slow runs only and surfaces block errors', async () => {
    const log = vi.fn();
    const gate = new RefreshGate({ log });
    await gate.run('quick', 0, async () => 1);
    expect(log).not.toHaveBeenCalled();
    const slow = gate.run('slow', 0, async () => {
      await new Promise((resolve) => setTimeout(resolve, QUIET_UNDER_MS));
      return 2;
    });
    await vi.advanceTimersByTimeAsync(QUIET_UNDER_MS);
    expect(await slow).toBe(2);
    expect(log).toHaveBeenCalledWith(`slow: done in ${QUIET_UNDER_MS}ms`);
    await expect(
      gate.run('boom', 0, async () => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');
    expect(gate.state).toEqual({ kind: 'Idle' });
    expect(await gate.run('after', 0, async () => 3)).toBe(3);
  });

  it('exposes the shared instance and the default timeout', () => {
    expect(sharedRefreshGate).toBeInstanceOf(RefreshGate);
    expect(REFRESH_TIMEOUT_MS).toBe(600_000);
  });
});
