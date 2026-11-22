import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_DIGITS, NUMBER_ENTRY_TIMEOUT_MS, NumberEntry } from './numberEntry';

describe('NumberEntry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('accumulates digits, commits after the pause, on OK, or at four digits; BACK cancels', () => {
    const commit = vi.fn();
    const entry = new NumberEntry(commit);
    const seen: (string | null)[] = [];
    entry.subscribe(() => seen.push(entry.digits));
    expect(entry.digits).toBeNull();
    entry.commit();
    entry.push(2);
    vi.advanceTimersByTime(NUMBER_ENTRY_TIMEOUT_MS - 100);
    entry.push(4);
    expect(entry.digits).toBe('24');
    vi.advanceTimersByTime(NUMBER_ENTRY_TIMEOUT_MS);
    expect(commit).toHaveBeenCalledWith(24);
    expect(entry.digits).toBeNull();
    entry.push(7);
    entry.commit();
    expect(commit).toHaveBeenLastCalledWith(7);
    entry.push(1);
    entry.cancel();
    vi.advanceTimersByTime(NUMBER_ENTRY_TIMEOUT_MS * 2);
    expect(commit).toHaveBeenCalledTimes(2);
    for (let i = 0; i < MAX_DIGITS; i += 1) entry.push(9);
    expect(commit).toHaveBeenLastCalledWith(9999);
    expect(seen.at(-1)).toBeNull();
  });
});
