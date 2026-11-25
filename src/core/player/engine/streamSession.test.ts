// The engine's seat in the `Provider stream limit` registry, exercised through
// `WebPlayerEngine` with a fake transport: a second live stream that ends or
// errors inside the slate window surfaces the one-stream Error and arms no
// retry; a tune that would be a second stream on a Limited host never connects;
// alone on the line, or on a finite file, nothing changes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STREAM_LIMIT_MESSAGE, StreamConcurrency } from '../connection/streamConcurrency';
import { forgetProbes, rememberProbe } from '../probe/probeMemo';
import { fire, stubMediaPlayback } from '../testSupport';
import { NO_TRACKS, type TrackSnapshot } from './trackModels';
import type { Transport, TransportListener } from '../transport/transport';
import { createVideoElement } from '../video/videoElement';
import { WebPlayerEngine } from './webPlayerEngine';

class FakeTransport implements Transport {
  readonly kind = 'mpegts';
  tracks: TrackSnapshot = NO_TRACKS;
  loads: string[] = [];
  stops = 0;
  listener: TransportListener | null = null;
  load(_video: HTMLVideoElement, url: string, _o: unknown, listener: TransportListener): Promise<void> {
    this.loads.push(url);
    this.listener = listener;
    return Promise.resolve();
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

const HOLDER = 'http://provider.example/live/1.ts';
const SECOND = 'http://provider.example/live/2.ts';
const THIRD = 'http://provider.example/live/3.ts';
const LIMITED = { kind: 'Error', message: STREAM_LIMIT_MESSAGE };

describe('StreamSession × Provider stream limit', () => {
  let now: number;
  let transport: FakeTransport;
  let scheduled: { delayMs: number; task: () => void }[];
  let registry: StreamConcurrency;
  let video: HTMLVideoElement;
  let engine: WebPlayerEngine;

  beforeEach(() => {
    stubMediaPlayback();
    forgetProbes();
    now = 0;
    transport = new FakeTransport();
    scheduled = [];
    registry = new StreamConcurrency(
      () => now,
      () => undefined,
    );
    video = createVideoElement();
    engine = new WebPlayerEngine({
      transportFor: () => Promise.resolve(transport),
      schedule: (delayMs, task) => scheduled.push({ delayMs, task }),
      ticker: null,
      telemetry: null,
      concurrency: registry,
    });
    engine.attach(video);
  });

  const loaded = (count: number): Promise<void> =>
    vi.waitFor(() => expect(transport.loads).toHaveLength(count));

  it('a second live stream that Ends inside the window surfaces the one-stream Error, no retry armed', async () => {
    const holder = registry.open(HOLDER, true);
    engine.load(SECOND, { live: true });
    await loaded(1);
    now += 2_000;
    fire(video, 'ended');
    expect(engine.state).toEqual(LIMITED);
    expect(scheduled).toHaveLength(0);
    expect(registry.state).toMatchObject({ kind: 'Limited', host: 'provider.example' });
    holder.close('Closed');
  });

  it('an error inside the window is terminal too: the reconnector never loops on a slate', async () => {
    registry.open(HOLDER, true);
    engine.load(SECOND, { live: true });
    await loaded(1);
    transport.listener?.onError('NetworkError/Exception');
    expect(engine.state).toEqual(LIMITED);
    expect(scheduled).toHaveLength(0);
  });

  it('on a Limited host with another stream open, a live tune is refused before it connects', async () => {
    registry.open(HOLDER, true);
    engine.load(SECOND, { live: true });
    await loaded(1);
    fire(video, 'ended');
    engine.load(THIRD, { live: true });
    expect(engine.state).toEqual(LIMITED);
    expect(transport.stops).toBe(1);
    await Promise.resolve();
    expect(transport.loads).toEqual([SECOND]);
    // An archive is never a stream the provider refuses: it tunes.
    engine.load(THIRD, { live: false, startPositionMs: 0 });
    expect(engine.state.kind).toBe('Buffering');
    await loaded(2);
  });

  it('alone on the line, an early end is just Ended and an error retries as before', async () => {
    engine.load(SECOND, { live: true });
    await loaded(1);
    fire(video, 'ended');
    expect(engine.state.kind).toBe('Ended');
    engine.load(THIRD, { live: true });
    await loaded(2);
    transport.listener?.onError('drop');
    expect(engine.state).toMatchObject({ kind: 'Reconnecting', attempt: 1 });
    expect(scheduled).toHaveLength(1);
  });

  it('a finite file labelled live (the probe saw a Content-Length) never counts', async () => {
    registry.open(HOLDER, true);
    rememberProbe(SECOND, { ok: true, contentType: 'video/mp2t', contentLength: 1_756_484 }, Date.now());
    engine.load(SECOND, { live: true });
    await loaded(1);
    fire(video, 'ended');
    expect(engine.state.kind).toBe('Ended');
    expect(registry.state.kind).toBe('Unknown');
  });

  it('stop and a zap close the engine’s stream, so the next tune is not its own sibling', async () => {
    engine.load(SECOND, { live: true });
    await loaded(1);
    engine.load(THIRD, { live: true });
    await loaded(2);
    fire(video, 'ended');
    expect(engine.state.kind).toBe('Ended');
    engine.load(SECOND, { live: true });
    await loaded(3);
    engine.stop();
    const other = registry.open(HOLDER, true);
    expect(other.close('Ended')).toBe(false);
  });
});
