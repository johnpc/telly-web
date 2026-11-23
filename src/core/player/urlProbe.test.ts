import { describe, expect, it, vi } from 'vitest';
import { SNIFF_BYTES, TS_PACKET } from './containerSniff';
import { probeUrl, sniffStream, UNKNOWN_PROBE, type FetchLike } from './urlProbe';

function respond(status: number, headers: Record<string, string>): FetchLike {
  return () => Promise.resolve(new Response(null, { status, headers }));
}

describe('probeUrl', () => {
  it('HEADs the url and reads media type + content length', async () => {
    const fetchImpl = vi.fn(
      respond(200, { 'content-type': 'video/MP2T; charset=x', 'content-length': '4096' }),
    );
    await expect(probeUrl('http://s/1.ts', fetchImpl)).resolves.toEqual({
      ok: true,
      contentType: 'video/mp2t',
      contentLength: 4096,
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://s/1.ts');
    expect(fetchImpl.mock.calls[0]?.[1].method).toBe('HEAD');
  });

  it('a chunked live pipe has no length; a missing or blank type is null', async () => {
    await expect(probeUrl('http://s/live', respond(200, { 'content-type': ' ' }))).resolves.toEqual({
      ok: true,
      contentType: null,
      contentLength: null,
    });
    await expect(probeUrl('http://s/live', respond(200, { 'content-length': 'nope' }))).resolves.toEqual({
      ok: true,
      contentType: null,
      contentLength: null,
    });
  });

  it('non-2xx, network failure and no fetch at all resolve to the unknown probe', async () => {
    await expect(probeUrl('http://s/x', respond(405, {}))).resolves.toEqual(UNKNOWN_PROBE);
    await expect(probeUrl('http://s/x', () => Promise.reject(new TypeError('cors')))).resolves.toEqual(
      UNKNOWN_PROBE,
    );
    await expect(probeUrl('http://s/x', null)).resolves.toEqual(UNKNOWN_PROBE);
  });

  it('uses the global fetch by default', async () => {
    vi.stubGlobal('fetch', respond(200, { 'content-length': '12' }));
    await expect(probeUrl('http://s/1.ts')).resolves.toEqual({
      ok: true,
      contentType: null,
      contentLength: 12,
    });
    vi.unstubAllGlobals();
  });
});

/** A body that keeps producing `chunk` forever, like a live pipe ignoring Range; `onCancel` fires when the reader lets go. */
function endlessBody(chunk: Uint8Array, onCancel: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(chunk);
    },
    cancel: onCancel,
  });
}

function tsPacket(): Uint8Array {
  const packet = new Uint8Array(TS_PACKET).fill(0xab);
  packet[0] = 0x47;
  return packet;
}

describe('sniffStream', () => {
  it('asks for the first 8 TS packets with a Range header', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(new Response(new Uint8Array(0))));
    await sniffStream('http://s/live/1', fetchImpl);
    const init = fetchImpl.mock.calls[0]?.[1];
    if (init === undefined) throw new Error('no request');
    expect(init.headers).toEqual({ Range: `bytes=0-${SNIFF_BYTES - 1}` });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('raw MPEG-TS labelled video/mp4 by a live pipe (no end, Range ignored) is video/mp2t', async () => {
    let cancelled = false;
    const stream = endlessBody(tsPacket(), () => {
      cancelled = true;
    });
    const fetchImpl: FetchLike = () =>
      Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'video/mp4' } }));
    await expect(sniffStream('http://s/live/1', fetchImpl)).resolves.toBe('video/mp2t');
    expect(cancelled).toBe(true);
  });

  it('an #EXTM3U body is HLS, an ftyp box is mp4, whatever the header says', async () => {
    const serve =
      (body: BodyInit, type: string): FetchLike =>
      () =>
        Promise.resolve(new Response(body, { status: 206, headers: { 'content-type': type } }));
    await expect(sniffStream('http://s/1', serve('#EXTM3U\n#EXT-X-VERSION:3\n', 'text/plain'))).resolves.toBe(
      'application/vnd.apple.mpegurl',
    );
    const ftyp = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 105, 115, 111, 109]);
    await expect(sniffStream('http://s/1', serve(ftyp, 'application/octet-stream'))).resolves.toBe(
      'video/mp4',
    );
  });

  it('an undecided body falls back to the Content-Type (also when the body is not a stream)', async () => {
    const noise = new Uint8Array(64).fill(0x11);
    const typed: FetchLike = () =>
      Promise.resolve(new Response(noise, { status: 200, headers: { 'content-type': 'video/MP2T; x=y' } }));
    await expect(sniffStream('http://s/1', typed)).resolves.toBe('video/mp2t');
    const bodiless: FetchLike = () =>
      Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'video/webm' }),
        body: null,
        arrayBuffer: () => Promise.resolve(noise.buffer),
      } as unknown as Response);
    await expect(sniffStream('http://s/1', bodiless)).resolves.toBe('video/webm');
    await expect(sniffStream('http://s/1', () => Promise.resolve(new Response(noise)))).resolves.toBeNull();
  });

  it('non-2xx, a network failure and no fetch at all resolve to null', async () => {
    await expect(sniffStream('http://s/x', respond(405, {}))).resolves.toBeNull();
    await expect(sniffStream('http://s/x', () => Promise.reject(new TypeError('cors')))).resolves.toBeNull();
    await expect(sniffStream('http://s/x', null)).resolves.toBeNull();
  });

  it('uses the global fetch by default', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('#EXTM3U\n')));
    await expect(sniffStream('http://s/1')).resolves.toBe('application/vnd.apple.mpegurl');
    vi.unstubAllGlobals();
  });
});
