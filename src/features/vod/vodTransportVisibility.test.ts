import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VodTransportVisibility } from './vodTransportVisibility';

describe('VodTransportVisibility', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows on poke and hides after the timeout while playing', () => {
    const transport = new VodTransportVisibility(() => 5_000);
    const seen: boolean[] = [];
    transport.subscribe(() => seen.push(transport.visible));
    expect(transport.visible).toBe(false);
    transport.poke(false);
    expect(transport.visible).toBe(true);
    vi.advanceTimersByTime(4_999);
    expect(transport.visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(transport.visible).toBe(false);
    expect(seen).toEqual([true, false]);
  });

  it('stays up while paused and re-arms the hide on the next poke', () => {
    const transport = new VodTransportVisibility(() => 1_000);
    transport.poke(true);
    vi.advanceTimersByTime(10_000);
    expect(transport.visible).toBe(true);
    transport.poke(false);
    vi.advanceTimersByTime(900);
    transport.poke(false);
    vi.advanceTimersByTime(900);
    expect(transport.visible).toBe(true);
    vi.advanceTimersByTime(100);
    expect(transport.visible).toBe(false);
  });

  it('dispose cancels the armed hide and hides; repeated same-state pokes do not notify', () => {
    const transport = new VodTransportVisibility(() => 1_000);
    let notified = 0;
    transport.subscribe(() => (notified += 1));
    transport.poke(false);
    transport.poke(false);
    expect(transport.state.kind).toBe('Shown');
    expect(notified).toBe(1);
    transport.dispose();
    expect(transport.state).toEqual({ kind: 'Hidden' });
    vi.advanceTimersByTime(5_000);
    expect(notified).toBe(2);
    transport.poke(true);
    expect(transport.state).toEqual({ kind: 'Shown', hide: null });
    transport.dispose();
  });
});
