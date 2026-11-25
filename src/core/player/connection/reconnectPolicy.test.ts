import { describe, expect, it } from 'vitest';
import { ReconnectPolicy } from './reconnectPolicy';

describe('ReconnectPolicy', () => {
  it('delays double from the base and cap, then the budget runs out', () => {
    const policy = new ReconnectPolicy({ maxAttempts: 6, baseDelayMs: 1_000, maxDelayMs: 30_000 });

    const delays = Array.from({ length: 6 }, () => policy.nextDelayMs());

    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000]);
    expect(policy.nextDelayMs()).toBeNull();
    expect(policy.attempt).toBe(6);
  });

  it('uses the Android defaults (6 attempts, 1 s base, 30 s cap)', () => {
    const policy = new ReconnectPolicy();
    const delays = Array.from({ length: 7 }, () => policy.nextDelayMs());
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, null]);
  });

  it('reset restores the full budget after a successful reconnect', () => {
    const policy = new ReconnectPolicy({ maxAttempts: 2 });
    policy.nextDelayMs();
    policy.nextDelayMs();
    expect(policy.nextDelayMs()).toBeNull();

    policy.reset();

    expect(policy.attempt).toBe(0);
    expect(policy.nextDelayMs()).toBe(1_000);
  });

  it('the delay never exceeds the cap', () => {
    const policy = new ReconnectPolicy({ maxAttempts: 10, baseDelayMs: 1_000, maxDelayMs: 5_000 });
    const delays = Array.from({ length: 10 }, () => policy.nextDelayMs() ?? 0);
    expect(Math.max(...delays)).toBe(5_000);
  });
});
