import { describe, expect, it } from 'vitest';
import type { HoldTimers } from '@/core/input/holdKeyDetector';
import { EXIT_MESSAGE, EXIT_WINDOW_MS, ExitConfirm } from './exitConfirm';

function fakeTimers(): HoldTimers & { fire(): void; cleared: number } {
  let pending: (() => void) | null = null;
  const timers = {
    cleared: 0,
    set: (callback: () => void, ms: number): number => {
      expect(ms).toBe(EXIT_WINDOW_MS);
      pending = callback;
      return 1;
    },
    clear: (): void => {
      timers.cleared += 1;
    },
    fire: (): void => pending?.(),
  };
  return timers;
}

describe('ExitConfirm', () => {
  it('warns on the first BACK, exits on the second while the toast shows, disarms after the window', () => {
    const timers = fakeTimers();
    const exit = new ExitConfirm(timers);
    let changes = 0;
    exit.subscribe(() => (changes += 1));
    expect(exit.warning).toBe(false);
    expect(exit.onBack()).toBe(false);
    expect(exit.warning).toBe(true);
    expect(exit.onBack()).toBe(true);
    timers.fire();
    expect(exit.warning).toBe(false);
    expect(exit.onBack()).toBe(false);
    exit.dispose();
    expect(timers.cleared).toBe(1);
    expect(exit.warning).toBe(false);
    expect(changes).toBe(3);
    expect(EXIT_MESSAGE).toBe('Press BACK again to exit');
  });
  it('uses real timers by default', () => {
    const exit = new ExitConfirm();
    expect(exit.onBack()).toBe(false);
    exit.dispose();
  });
});
