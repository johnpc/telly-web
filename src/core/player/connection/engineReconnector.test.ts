import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineReconnector, STALLED } from './engineReconnector';
import { ReconnectPolicy } from './reconnectPolicy';

describe('EngineReconnector', () => {
  let scheduled: { delayMs: number; task: () => void }[];
  let reconnector: EngineReconnector;

  beforeEach(() => {
    scheduled = [];
    reconnector = new EngineReconnector(new ReconnectPolicy({ maxAttempts: 2 }), (delayMs, task) =>
      scheduled.push({ delayMs, task }),
    );
  });

  it('arms a backoff retry and surfaces Reconnecting(attempt, epoch)', () => {
    const retry = vi.fn();
    expect(reconnector.onError('MEDIA_ERR_NETWORK', retry)).toEqual({
      kind: 'Reconnecting',
      attempt: 1,
      epoch: 0,
    });
    expect(scheduled.map((s) => s.delayMs)).toEqual([1_000]);

    scheduled[0]?.task();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('a spent budget surfaces the hard error instead of another retry', () => {
    reconnector.onError('a', vi.fn());
    reconnector.onError('b', vi.fn());
    expect(reconnector.onError('MEDIA_ERR_DECODE', vi.fn())).toEqual({
      kind: 'Error',
      message: 'MEDIA_ERR_DECODE',
    });
    expect(scheduled).toHaveLength(2);
  });

  it('reset retires the armed retry: a zap during a reconnect never re-tunes the next channel', () => {
    const stale = vi.fn();
    reconnector.onError('drop', stale);
    reconnector.reset();
    scheduled[0]?.task();
    expect(stale).not.toHaveBeenCalled();
    expect(reconnector.currentEpoch).toBe(1);
  });

  it('reset also restores the budget, and new retries carry the new epoch', () => {
    reconnector.onError('a', vi.fn());
    reconnector.onError('b', vi.fn());
    reconnector.reset();
    expect(reconnector.onError('c', vi.fn())).toEqual({ kind: 'Reconnecting', attempt: 1, epoch: 1 });
  });

  it('a stall recovers on the same budget and spends it to STREAM_STALLED', () => {
    const retry = vi.fn();
    expect(reconnector.onStall(retry)).toEqual({ kind: 'Reconnecting', attempt: 1, epoch: 0 });
    scheduled[0]?.task();
    expect(retry).toHaveBeenCalledTimes(1);

    reconnector.onStall(vi.fn());
    expect(reconnector.onStall(vi.fn())).toEqual({ kind: 'Error', message: STALLED });
  });
});
