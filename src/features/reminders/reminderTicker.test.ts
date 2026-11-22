import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import { isVisible, startReminderTicks, type TickerDeps } from './reminderTicker';

describe('startReminderTicks', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
  afterEach(() => vi.useRealTimers());

  it('ticks on the interval while visible, sweeps on table changes, stops cleanly', async () => {
    const db = freshDb();
    let state: DocumentVisibilityState = 'visible';
    const listeners = new Set<() => void>();
    const visibility: TickerDeps['visibility'] = {
      get visibilityState() {
        return state;
      },
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
        listeners.add(listener as () => void),
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
        listeners.delete(listener as () => void),
    } as unknown as TickerDeps['visibility'];
    const deps: TickerDeps = { db, intervalMs: 1000, visibility };
    const onTick = vi.fn(async () => undefined);
    // Wait on the real condition (a row observed), never on elapsed time: the live query
    // emits through IndexedDB callbacks that fake timers do not drive.
    let sawRow: () => void = () => undefined;
    const rowSeen = new Promise<void>((resolve) => {
      sawRow = resolve;
    });
    const onRows = vi.fn(async (rows: { title: string }[]) => {
      if (rows.length > 0) sawRow();
    });
    const stop = startReminderTicks(onTick, onRows, deps);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onTick).toHaveBeenCalledTimes(1);
    state = 'hidden';
    await vi.advanceTimersByTimeAsync(1000);
    expect(onTick).toHaveBeenCalledTimes(1);
    state = 'visible';
    listeners.forEach((listener) => listener());
    expect(onTick).toHaveBeenCalledTimes(2);
    await db.reminders.add({ channelId: 1, title: 't', startMs: 1, stopMs: 2, firedAtMs: 0 });
    await rowSeen;
    expect(onRows).toHaveBeenCalled();
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(onTick).toHaveBeenCalledTimes(2);
    expect(listeners.size).toBe(0);
    expect(isVisible({ ...deps, visibility: null })).toBe(true);
  });
});
