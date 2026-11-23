import { describe, expect, it, vi } from 'vitest';
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
});
