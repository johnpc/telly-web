import { describe, expect, it, vi } from 'vitest';
import { recordProgressive } from './progressiveRecorder';
import { bytes, streamResponse } from './recordingTestSupport';
import type { CaptureContext, CaptureSink } from './streamRecorder';

function sinkOf(): CaptureSink & { chunks: Uint8Array[] } {
  const chunks: Uint8Array[] = [];
  return {
    chunks,
    write: (chunk) => {
      chunks.push(chunk);
      return Promise.resolve();
    },
  };
}

function ctxOf(response: Response, shouldStop = (): boolean => false): CaptureContext {
  return {
    fetch: vi.fn().mockResolvedValue(response),
    signal: new AbortController().signal,
    shouldStop,
    delay: () => Promise.resolve(),
  };
}

describe('recordProgressive', () => {
  it('streams the body chunk by chunk into the sink and returns the byte count', async () => {
    const sink = sinkOf();
    const written = await recordProgressive(
      'http://x/a.ts',
      sink,
      ctxOf(streamResponse([bytes(1, 2), bytes(3)])),
    );
    expect(written).toBe(3);
    expect(sink.chunks).toEqual([bytes(1, 2), bytes(3)]);
  });

  it('stops reading between chunks once the capture should stop', async () => {
    const sink = sinkOf();
    let reads = 0;
    const ctx = ctxOf(streamResponse([bytes(1), bytes(2), bytes(3)]), () => reads++ >= 1);
    expect(await recordProgressive('http://x/a.ts', sink, ctx)).toBe(1);
  });

  it('throws on a non-OK response so the engine counts the attempt idle', async () => {
    const ctx = ctxOf(new Response(null, { status: 503 }));
    await expect(recordProgressive('http://x/a.ts', sinkOf(), ctx)).rejects.toThrow('HTTP 503');
  });

  it('writes a body-less response in one go', async () => {
    const response = {
      ok: true,
      body: null,
      arrayBuffer: () => Promise.resolve(bytes(7, 8).buffer),
    } as unknown as Response;
    const sink = sinkOf();
    expect(await recordProgressive('http://x/a.ts', sink, ctxOf(response))).toBe(2);
    expect(sink.chunks[0]).toEqual(bytes(7, 8));
  });
});
