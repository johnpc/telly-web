import { describe, expect, it, vi } from 'vitest';
import { StreamConcurrency } from '@/core/player';
import { MAX_IDLE_ATTEMPTS, runAttempts } from './captureAttempts';
import type { Capture } from './captureContext';
import { bytes } from './recordingTestSupport';
import type { CaptureSink, StreamRecorder } from './streamRecorder';

function captureOf(): Capture {
  return {
    id: 1,
    plannedEndMs: 1_000_000,
    controller: new AbortController(),
    stopped: false,
    bytes: 0,
    done: Promise.resolve(),
  };
}

const sink: CaptureSink = { write: () => Promise.resolve() };
const fetch = vi.fn();

describe('runAttempts', () => {
  it('gives up after three idle attempts in a row, pausing between them', async () => {
    const capture = captureOf();
    const recorder = vi.fn<StreamRecorder>().mockResolvedValue(0);
    const onError = vi.fn();
    await runAttempts('http://x/a.ts', capture, sink, {
      clock: () => 0,
      fetch,
      recorder,
      retryDelayMs: 0,
      onError,
    });
    expect(recorder).toHaveBeenCalledTimes(MAX_IDLE_ATTEMPTS);
    expect(onError).not.toHaveBeenCalled();
  });

  it('resets the idle count whenever an attempt wrote bytes and reports failures', async () => {
    const capture = captureOf();
    let calls = 0;
    const recorder = vi.fn<StreamRecorder>(async (_url, s) => {
      calls += 1;
      if (calls === 2) throw new Error('boom');
      if (calls <= 3) {
        await s.write(bytes(1));
        capture.bytes += 1;
        return 1;
      }
      return 0;
    });
    const onError = vi.fn();
    await runAttempts('http://x/a.ts', capture, sink, {
      clock: () => 0,
      fetch,
      recorder,
      retryDelayMs: 0,
      onError,
    });
    // 1 ok, 2 error (idle 1), 3 ok (idle 0), then three idle attempts.
    expect(recorder).toHaveBeenCalledTimes(6);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });

  it('stops at once when the capture is stopped', async () => {
    const capture = captureOf();
    const recorder = vi.fn<StreamRecorder>(() => {
      capture.stopped = true;
      return Promise.resolve(0);
    });
    await runAttempts('http://x/a.ts', capture, sink, {
      clock: () => 0,
      fetch,
      recorder,
      retryDelayMs: 0,
      onError: vi.fn(),
    });
    expect(recorder).toHaveBeenCalledTimes(1);
  });

  it('does not even start past the planned end', async () => {
    const capture = captureOf();
    const recorder = vi.fn<StreamRecorder>();
    await runAttempts('http://x/a.ts', capture, sink, {
      clock: () => 2_000_000,
      fetch,
      recorder,
      retryDelayMs: 0,
      onError: vi.fn(),
    });
    expect(recorder).not.toHaveBeenCalled();
  });

  /** The capture's own fetch: a live pipe (no Content-Length) or a finite file. */
  const responding =
    (headers: HeadersInit) =>
    (url: string): Promise<Response> =>
      Promise.resolve(new Response(url, { headers }));

  /** An attempt that reads its URL once and copies a chunk — the slate shape: bytes, then the end. */
  const slateRecorder: StreamRecorder = async (url, s, ctx) => {
    await ctx.fetch(url);
    await s.write(bytes(1));
    return 1;
  };

  function limitRig(headers: HeadersInit = {}): { registry: StreamConcurrency; run: () => Promise<string> } {
    const registry = new StreamConcurrency(
      () => 0,
      () => undefined,
    );
    const capture = captureOf();
    // The slate shape once; a source that keeps yielding would (rightly) never end the loop on its own.
    const recorder = vi.fn<StreamRecorder>(async (url, s, ctx) => {
      if (recorder.mock.calls.length > 1) return 0;
      const written = await slateRecorder(url, s, ctx, { lastSequence: -1, initWritten: false });
      capture.bytes += written;
      return written;
    });
    const run = (): Promise<string> =>
      runAttempts('http://provider.example/live/2.ts', capture, sink, {
        clock: () => 0,
        fetch: responding(headers),
        recorder,
        retryDelayMs: 0,
        onError: vi.fn(),
        concurrency: registry,
      });
    return { registry, run };
  }

  it('a live pipe that ends inside the slate window while another live stream of the host is open is Limited', async () => {
    const { registry, run } = limitRig();
    registry.open('http://provider.example/live/1.ts', true);
    expect(await run()).toBe('Limited');
    expect(registry.state).toMatchObject({ kind: 'Limited', host: 'provider.example' });
  });

  it('a finite file (Content-Length), or a line nobody else is on, runs the loop to its normal end', async () => {
    const finite = limitRig({ 'content-length': '1756484' });
    finite.registry.open('http://provider.example/live/1.ts', true);
    expect(await finite.run()).toBe('Completed');
    expect(finite.registry.state.kind).toBe('Unknown');
    const alone = limitRig();
    expect(await alone.run()).toBe('Completed');
  });

  it('a host already known to be Limited refuses a second stream without a single fetch', async () => {
    const { registry, run } = limitRig();
    registry.open('http://provider.example/live/1.ts', true);
    registry.open('http://provider.example/live/3.ts', true).close('Ended');
    const fetched = vi.fn();
    const capture = captureOf();
    const outcome = await runAttempts('http://provider.example/live/2.ts', capture, sink, {
      clock: () => 0,
      fetch: fetched,
      recorder: vi.fn<StreamRecorder>(),
      retryDelayMs: 0,
      onError: vi.fn(),
      concurrency: registry,
    });
    expect(outcome).toBe('Limited');
    expect(fetched).not.toHaveBeenCalled();
    void run;
  });
});
