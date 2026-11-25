import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleOf, setTimeoutSchedule, telemetryOf, tickerOf } from './engineDeps';
import { LOG_TAG, PlaybackTelemetry } from '../telemetry/playbackTelemetry';
import { intervalTicker } from '../connection/stallWatchdog';

const transportFor = (): never => {
  throw new Error('unused');
};

describe('engine deps defaults', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries post through setTimeout by default', () => {
    vi.useFakeTimers();
    const task = vi.fn();
    scheduleOf({ transportFor })(500, task);
    vi.advanceTimersByTime(499);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledTimes(1);
    const custom = vi.fn();
    expect(scheduleOf({ transportFor, schedule: custom })).toBe(custom);
    expect(setTimeoutSchedule).toBeTypeOf('function');
  });

  it('the default telemetry logs to the console under telly-play; null silences it', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const telemetry = telemetryOf({ transportFor });
    telemetry?.note('hello');
    expect(info).toHaveBeenCalledWith(LOG_TAG, 'hello');
    expect(telemetryOf({ transportFor, telemetry: null })).toBeNull();
    const own = new PlaybackTelemetry(
      () => 0,
      () => undefined,
    );
    expect(telemetryOf({ transportFor, telemetry: own })).toBe(own);
  });

  it('the watchdog ticks on setInterval unless disabled', () => {
    expect(tickerOf({ transportFor })).toBe(intervalTicker);
    expect(tickerOf({ transportFor, ticker: null })).toBeNull();
  });
});
