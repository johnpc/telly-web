import { describe, expect, it, vi } from 'vitest';
import { fetchBytes, fetchPlaylistText, proxied } from './playlistFetcher';

describe('playlistFetcher', () => {
  it('proxies only when a base is set', () => {
    expect(proxied('http://p/a b.m3u', '')).toBe('http://p/a b.m3u');
    expect(proxied('http://p/a b.m3u', undefined)).toBe('http://p/a b.m3u');
    expect(proxied('http://p/x?y=1', ' https://proxy/?url= ')).toBe(
      'https://proxy/?url=http%3A%2F%2Fp%2Fx%3Fy%3D1',
    );
  });

  it('fetches directly first and falls back to the proxy only on a network failure', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('bad')) return new Response('', { status: 503 });
      if (url.startsWith('https://cors/')) return new Response('#EXTM3U\nvia-proxy');
      if (url.includes('blocked')) throw new TypeError('Failed to fetch');
      return new Response('#EXTM3U\n');
    });
    expect(await fetchPlaylistText('http://p/list.m3u', { proxyBase: 'https://cors/', fetchImpl })).toBe(
      '#EXTM3U\n',
    );
    expect(fetchImpl).toHaveBeenLastCalledWith('http://p/list.m3u', {});
    expect(await fetchPlaylistText('http://p/blocked.m3u', { proxyBase: 'https://cors/', fetchImpl })).toBe(
      '#EXTM3U\nvia-proxy',
    );
    expect(fetchImpl).toHaveBeenLastCalledWith('https://cors/http%3A%2F%2Fp%2Fblocked.m3u', {});
    // An HTTP error from the source is reported, not retried through the proxy.
    await expect(
      fetchPlaylistText('http://p/bad', { proxyBase: 'https://cors/', fetchImpl }),
    ).rejects.toThrow('HTTP 503 while downloading playlist');
    // Without a proxy a network failure propagates.
    await expect(fetchPlaylistText('http://p/blocked.m3u', { fetchImpl })).rejects.toThrow('Failed to fetch');
  });

  it('fetches bytes and forwards an abort signal', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const bytes = await fetchBytes('http://e/epg.xml.gz', 'EPG', { fetchImpl, signal: controller.signal });
    expect([...bytes]).toEqual([1, 2, 3]);
    expect(fetchImpl).toHaveBeenCalledWith('http://e/epg.xml.gz', { signal: controller.signal });
    const failing = vi.fn(async () => new Response('', { status: 404 }));
    await expect(fetchBytes('http://e/x', 'EPG', { fetchImpl: failing })).rejects.toThrow(
      'HTTP 404 while downloading EPG',
    );
  });
});
