import { describe, expect, it, vi } from 'vitest';
import { freshDb } from '@/test/dbFixtures';
import { fakeEntry } from './recordingTestSupport';
import { RECORDING_TICK_MS, defaultRecordingTickerDeps, startRecordingTicks } from './recordingTicker';

const settle = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('startRecordingTicks', () => {
  it('ticks on the interval while visible and sweeps the SCHEDULED rows on every change', async () => {
    const db = freshDb();
    const onTick = vi.fn().mockResolvedValue(undefined);
    const onRows = vi.fn().mockResolvedValue(undefined);
    const stop = startRecordingTicks(onTick, onRows, { db, intervalMs: 10, visibility: null });
    await vi.waitFor(() => expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(2));
    await db.recordings.add(fakeEntry());
    await vi.waitFor(() =>
      expect(onRows).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'SCHEDULED' })]),
    );
    stop();
    const ticks = onTick.mock.calls.length;
    await settle(40);
    expect(onTick.mock.calls.length).toBe(ticks);
  });

  it('skips ticks and row sweeps while the tab is hidden, and sweeps when it comes back', async () => {
    const db = freshDb();
    const listeners = new Set<() => void>();
    const visibility = {
      visibilityState: 'hidden' as DocumentVisibilityState,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
        void listeners.add(listener as () => void),
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) =>
        void listeners.delete(listener as () => void),
    };
    const onTick = vi.fn().mockResolvedValue(undefined);
    const onRows = vi.fn().mockResolvedValue(undefined);
    const stop = startRecordingTicks(onTick, onRows, { db, intervalMs: 5, visibility });
    await settle(30);
    expect(onTick).not.toHaveBeenCalled();
    expect(onRows).not.toHaveBeenCalled();
    visibility.visibilityState = 'visible';
    for (const listener of listeners) listener();
    expect(onTick).toHaveBeenCalledTimes(1);
    stop();
    expect(listeners.size).toBe(0);
  });

  it('defaults to the production database, a 15 s cadence and the document', () => {
    expect(defaultRecordingTickerDeps.intervalMs).toBe(RECORDING_TICK_MS);
    expect(defaultRecordingTickerDeps.visibility).toBe(document);
  });
});
