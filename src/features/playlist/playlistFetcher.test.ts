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

  it('fetches text through the proxy and throws on HTTP errors', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes('bad') ? new Response('', { status: 503 }) : new Response('#EXTM3U\n'),
    );
    const text = await fetchPlaylistText('http://p/list.m3u', { proxyBase: 'https://cors/', fetchImpl });
    expect(text).toBe('#EXTM3U\n');
    expect(fetchImpl).toHaveBeenCalledWith('https://cors/http%3A%2F%2Fp%2Flist.m3u', {});
    await expect(fetchPlaylistText('http://p/bad', { fetchImpl })).rejects.toThrow(
      'HTTP 503 while downloading playlist',
    );
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
