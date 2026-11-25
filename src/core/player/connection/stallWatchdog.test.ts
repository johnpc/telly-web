import { describe, expect, it, vi } from 'vitest';
import { PLAYING } from './engineState';
import { StallDetector } from './stallDetector';
import { intervalTicker, sampleOf, StallWatchdog, TICK_MS, type Ticker } from './stallWatchdog';

function manualTicker(): { ticker: Ticker; tick: () => void; cancelled: () => boolean } {
  let fn: (() => void) | null = null;
  let cancelled = false;
  const ticker: Ticker = (intervalMs, tick) => {
    expect(intervalMs).toBe(TICK_MS);
    fn = tick;
    return () => {
      cancelled = true;
    };
  };
  return { ticker, tick: () => fn?.(), cancelled: () => cancelled };
}

describe('StallWatchdog', () => {
  it('feeds the detector every tick and fires onStall when it says wedged', () => {
    const { ticker, tick } = manualTicker();
    const onStall = vi.fn();
    const onSample = vi.fn();
    const watchdog = new StallWatchdog(
      new StallDetector(2, 2),
      ticker,
      () => ({ state: 'Playing', playWhenReady: true, positionMs: 7 }),
      onStall,
      onSample,
    );
    watchdog.start();
    watchdog.start();
    expect(watchdog.running).toBe(true);

    tick();
    tick();
    expect(onStall).not.toHaveBeenCalled();
    tick();
    expect(onStall).toHaveBeenCalledTimes(1);
    expect(onSample).toHaveBeenCalledTimes(3);
  });

  it('stop cancels the ticker so sampling never outlives the engine', () => {
    const { ticker, tick, cancelled } = manualTicker();
    const onStall = vi.fn();
    const v = video();
    const watchdog = new StallWatchdog(new StallDetector(1, 1), ticker, () => sampleOf(v, PLAYING), onStall);
    watchdog.start();
    tick();
    expect(onStall).not.toHaveBeenCalled();
    watchdog.stop();
    expect(cancelled()).toBe(true);
    expect(watchdog.running).toBe(false);
    watchdog.stop();
  });

  it('samples the element: paused = not playWhenReady, currentTime in ms', () => {
    const v = video();
    v.currentTime = 1.234;
    expect(sampleOf(v, PLAYING)).toEqual({ state: 'Playing', playWhenReady: false, positionMs: 1234 });
  });

  it('the default ticker is a cancellable setInterval', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const cancel = intervalTicker(100, tick);
    vi.advanceTimersByTime(250);
    expect(tick).toHaveBeenCalledTimes(2);
    cancel();
    vi.advanceTimersByTime(250);
    expect(tick).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

function video(): HTMLVideoElement {
  return document.createElement('video');
}
