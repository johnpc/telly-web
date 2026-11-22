import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS, HoldKeyDetector } from './holdKeyDetector';

describe('HoldKeyDetector (Long-press detection)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function detector(hold: string | null = 'LONG_OK'): { d: HoldKeyDetector<string>; out: string[] } {
    const out: string[] = [];
    return { d: new HoldKeyDetector<string>('OK', hold, (k) => out.push(k)), out };
  }

  it('starts Idle', () => {
    expect(detector().d.current).toBe('Idle');
  });

  it('fires the tap on a short press (key-up before the hold timer)', () => {
    const { d, out } = detector();
    d.onDown(false);
    expect(d.current).toBe('Held');
    vi.advanceTimersByTime(HOLD_MS - 1);
    d.onUp();
    expect(out).toEqual(['OK']);
    expect(d.current).toBe('Idle');
    vi.advanceTimersByTime(HOLD_MS);
    expect(out).toEqual(['OK']);
  });

  it('fires the hold once on the timer and nothing on release', () => {
    const { d, out } = detector();
    d.onDown(false);
    vi.advanceTimersByTime(HOLD_MS);
    expect(out).toEqual(['LONG_OK']);
    expect(d.current).toBe('HoldFired');
    d.onUp();
    expect(out).toEqual(['LONG_OK']);
    expect(d.current).toBe('Idle');
  });

  it('ignores auto-repeat key-downs so they neither restart nor duplicate the hold', () => {
    const { d, out } = detector();
    d.onDown(false);
    vi.advanceTimersByTime(300);
    d.onDown(true);
    d.onDown(true);
    vi.advanceTimersByTime(200);
    expect(out).toEqual(['LONG_OK']);
    d.onDown(true);
    vi.advanceTimersByTime(HOLD_MS);
    expect(out).toEqual(['LONG_OK']);
  });

  it('ignores a second key-down while already held', () => {
    const { d, out } = detector();
    d.onDown(false);
    vi.advanceTimersByTime(400);
    d.onDown(false);
    vi.advanceTimersByTime(100);
    expect(out).toEqual(['LONG_OK']);
  });

  it('does nothing on a key-up without a key-down', () => {
    const { d, out } = detector();
    d.onUp();
    expect(out).toEqual([]);
  });

  it('a null hold swallows the long press entirely', () => {
    const { d, out } = detector(null);
    d.onDown(false);
    vi.advanceTimersByTime(HOLD_MS);
    d.onUp();
    expect(out).toEqual([]);
    d.onDown(false);
    d.onUp();
    expect(out).toEqual(['OK']);
  });

  it('cancel forgets the press without emitting', () => {
    const { d, out } = detector();
    d.onDown(false);
    d.cancel();
    vi.advanceTimersByTime(HOLD_MS);
    d.onUp();
    expect(out).toEqual([]);
    expect(d.current).toBe('Idle');
    d.cancel();
    expect(d.current).toBe('Idle');
  });

  it('honours a custom hold duration and timer source', () => {
    const out: string[] = [];
    const set = vi.fn((cb: () => void, ms: number) => setTimeout(cb, ms));
    const clear = vi.fn((h: ReturnType<typeof setTimeout>) => clearTimeout(h));
    const d = new HoldKeyDetector<string>('OK', 'LONG', (k) => out.push(k), 200, { set, clear });
    d.onDown(false);
    expect(set).toHaveBeenCalledWith(expect.any(Function), 200);
    vi.advanceTimersByTime(200);
    expect(out).toEqual(['LONG']);
    d.onUp();
    d.onDown(false);
    d.onUp();
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
