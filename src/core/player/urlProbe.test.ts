import { describe, expect, it, vi } from 'vitest';
import { probeUrl, sniffContentType, UNKNOWN_PROBE, type FetchLike } from './urlProbe';

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

  it('sniffContentType is the HEAD fallback for extensionless urls', async () => {
    await expect(
      sniffContentType('http://s/ch/1', respond(200, { 'content-type': 'application/vnd.apple.mpegurl' })),
    ).resolves.toBe('application/vnd.apple.mpegurl');
    await expect(sniffContentType('http://s/ch/1', null)).resolves.toBeNull();
  });
});
