import { beforeEach, describe, expect, it } from 'vitest';
import { forgetProbes, rememberProbe } from '../probe/probeMemo';
import { StreamConcurrency } from './streamConcurrency';
import { StreamSlot } from './streamSlot';

const HOLDER = 'http://provider.example/live/1.ts';
const URL2 = 'http://provider.example/live/2.ts';

describe('StreamSlot', () => {
  let now: number;
  let registry: StreamConcurrency;
  let slot: StreamSlot;

  beforeEach(() => {
    forgetProbes();
    now = 0;
    registry = new StreamConcurrency(
      () => now,
      () => undefined,
    );
    slot = new StreamSlot(registry);
  });

  it('registers a live tune as a live stream when the probe saw no length (or never ran)', () => {
    registry.open(HOLDER, true);
    slot.open(URL2, { live: true });
    expect(registry.state.kind).toBe('Suspected');
    now += 2_000;
    expect(slot.close('Ended')).toBe(true);
    expect(slot.close('Ended')).toBe(false);
  });

  it('a finite file labelled live (probe saw a Content-Length) and an archive tune never count', () => {
    registry.open(HOLDER, true);
    rememberProbe(URL2, { ok: true, contentType: 'video/mp2t', contentLength: 1_756_484 }, Date.now());
    slot.open(URL2, { live: true });
    expect(registry.state.kind).toBe('Unknown');
    expect(slot.close('Ended')).toBe(false);
    slot.open(URL2, { live: false, startPositionMs: 0 });
    expect(slot.close('Error')).toBe(false);
  });

  it('refuses a live tune that would be a second stream on a Limited host, never an archive', () => {
    registry.open(HOLDER, true);
    slot.open(URL2, { live: true });
    slot.close('Ended');
    expect(slot.refuses(URL2, { live: true })).toBe(true);
    expect(slot.refuses(URL2, { live: false })).toBe(false);
    expect(slot.refuses('http://elsewhere.example/9.ts', { live: true })).toBe(false);
  });

  it('re-opening closes the stream it held (a stall retry never leaks a registration)', () => {
    const sibling = registry.open(HOLDER, true);
    slot.open(URL2, { live: true });
    slot.open(URL2, { live: true });
    sibling.close('Closed');
    // Only the slot's current stream is open: a fast end has no sibling to blame.
    now += 1_000;
    expect(slot.close('Ended')).toBe(false);
  });
});
