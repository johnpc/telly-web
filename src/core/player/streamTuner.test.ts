import { describe, expect, it, vi } from 'vitest';
import { StreamTuner } from './streamTuner';
import { NO_TRACKS } from './trackModels';
import { messageOf, type Transport, type TransportListener } from './transport';

class FakeTransport implements Transport {
  readonly kind = 'native';
  readonly tracks = NO_TRACKS;
  loads: string[] = [];
  stops = 0;
  constructor(private readonly gate: Promise<void> = Promise.resolve()) {}
  async load(_video: HTMLVideoElement, url: string): Promise<void> {
    await this.gate;
    this.loads.push(url);
  }
  stop(): void {
    this.stops += 1;
  }
  selectVideo(): void {
    return undefined;
  }
  selectAudio(): void {
    return undefined;
  }
  selectText(): void {
    return undefined;
  }
}

const listener: TransportListener = { onTracksChanged: vi.fn(), onDetails: vi.fn(), onError: vi.fn() };
const video = (): HTMLVideoElement => document.createElement('video');

describe('StreamTuner', () => {
  it('resolves a transport per url, stops the previous one and reports when still wanted', async () => {
    const built: FakeTransport[] = [];
    const tuner = new StreamTuner(() => {
      const t = new FakeTransport();
      built.push(t);
      return Promise.resolve(t);
    });
    expect(tuner.current).toBeNull();
    await expect(tuner.tune(video(), 'a', { live: true }, listener)).resolves.toBe(true);
    expect(tuner.current).toBe(built[0]);
    await expect(tuner.tune(video(), 'b', { live: true }, listener)).resolves.toBe(true);
    expect(built[0]?.stops).toBe(1);
    expect(built[1]?.loads).toEqual(['b']);
    tuner.cancel();
    expect(built[1]?.stops).toBe(1);
    expect(tuner.current).toBeNull();
  });

  it('a tune superseded while its library imports never binds', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow = new FakeTransport();
    const fast = new FakeTransport();
    const tuner = new StreamTuner((url) => (url === 'slow' ? gate.then(() => slow) : Promise.resolve(fast)));
    const first = tuner.tune(video(), 'slow', { live: true }, listener);
    const second = tuner.tune(video(), 'fast', { live: true }, listener);
    release();
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(slow.loads).toEqual([]);
    expect(tuner.current).toBe(fast);
  });

  it('a cancel during load reports not-wanted and setup errors propagate', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const t = new FakeTransport(gate);
    const tuner = new StreamTuner(() => Promise.resolve(t));
    const tuning = tuner.tune(video(), 'a', { live: true }, listener);
    tuner.cancel();
    release();
    await expect(tuning).resolves.toBe(false);

    const failing = new StreamTuner(() => Promise.reject(new Error('no MSE')));
    await expect(failing.tune(video(), 'a', { live: true }, listener)).rejects.toThrow('no MSE');
  });

  it('messageOf turns any thrown value into a displayable cause', () => {
    expect(messageOf(new Error('x'))).toBe('x');
    expect(messageOf('y')).toBe('y');
    expect(messageOf(42)).toBe('UNKNOWN_ERROR');
  });
});
