import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Capture, abortableDelay, captureContext, countingSink, defaultFetch } from './captureContext';
import { bytes } from './recordingTestSupport';

function captureOf(plannedEndMs = 10_000): Capture {
  return {
    id: 1,
    plannedEndMs,
    controller: new AbortController(),
    stopped: false,
    bytes: 0,
    done: Promise.resolve(),
  };
}

describe('captureContext', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('abortableDelay resolves on the timer or the moment the signal aborts', async () => {
    const controller = new AbortController();
    let resolved = false;
    void abortableDelay(1000, controller.signal).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(resolved).toBe(false);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
    const timed = abortableDelay(50, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(50);
    await expect(timed).resolves.toBeUndefined();
    const aborted = new AbortController();
    aborted.abort();
    await expect(abortableDelay(5000, aborted.signal)).resolves.toBeUndefined();
  });

  it('countingSink appends, counts bytes and reports the size at most once per throttle window', async () => {
    let now = 0;
    const capture = captureOf();
    const written: Uint8Array[] = [];
    const reports: number[] = [];
    const writable = {
      write: (c: Uint8Array) => {
        written.push(c);
        return Promise.resolve();
      },
      close: () => Promise.resolve(),
    };
    const sink = countingSink(
      capture,
      writable,
      (b) => reports.push(b),
      () => now,
      1000,
    );
    await sink.write(bytes(1, 2));
    now = 500;
    await sink.write(bytes(3));
    now = 1000;
    await sink.write(bytes(4, 5, 6));
    expect(capture.bytes).toBe(6);
    expect(written.length).toBe(3);
    expect(reports).toEqual([6]);
  });

  it('stops on a user stop or the planned end and exposes the abort signal', async () => {
    let now = 0;
    const capture = captureOf(100);
    const fetch = vi.fn().mockResolvedValue(new Response(''));
    const ctx = captureContext(capture, () => now, fetch);
    expect(ctx.shouldStop()).toBe(false);
    now = 100;
    expect(ctx.shouldStop()).toBe(true);
    now = 0;
    capture.stopped = true;
    expect(ctx.shouldStop()).toBe(true);
    expect(ctx.signal).toBe(capture.controller.signal);
    const delay = ctx.delay(10_000);
    capture.controller.abort();
    await expect(delay).resolves.toBeUndefined();
    await ctx.fetch('http://x');
    expect(fetch).toHaveBeenCalledWith('http://x');
  });

  it('defaultFetch forwards to the global fetch', async () => {
    const spy = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', spy);
    await defaultFetch('http://x/a', { method: 'GET' });
    expect(spy).toHaveBeenCalledWith('http://x/a', { method: 'GET' });
  });
});
