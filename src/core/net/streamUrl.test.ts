import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { resolveStreamUrl, resolvingFetch, streamUrlResolver } from './streamUrl';

const BASE = 'https://telly.jpc.io/proxy/?url=';
const ORIGIN = 'https://telly.jpc.io';

describe('resolveStreamUrl', () => {
  it('leaves the url alone without a base (blank or undefined)', () => {
    expect(resolveStreamUrl('http://p/live/1', undefined, ORIGIN)).toBe('http://p/live/1');
    expect(resolveStreamUrl('http://p/live/1', '  ', ORIGIN)).toBe('http://p/live/1');
  });

  it('routes a cross-origin url through the base, url-encoded', () => {
    expect(resolveStreamUrl('https://soursignal.com/a/b/1', BASE, ORIGIN)).toBe(
      `${BASE}${encodeURIComponent('https://soursignal.com/a/b/1')}`,
    );
    expect(resolveStreamUrl('http://p/x.ts?token=1&y=2', ' https://x/p?u= ', ORIGIN)).toBe(
      `https://x/p?u=${encodeURIComponent('http://p/x.ts?token=1&y=2')}`,
    );
  });

  it('never proxies blob, data, same-origin, relative or already-proxied urls', () => {
    expect(resolveStreamUrl('blob:https://telly.jpc.io/abc', BASE, ORIGIN)).toBe(
      'blob:https://telly.jpc.io/abc',
    );
    expect(resolveStreamUrl('data:video/mp4;base64,AAAA', BASE, ORIGIN)).toBe('data:video/mp4;base64,AAAA');
    expect(resolveStreamUrl('https://telly.jpc.io/streams/1.ts', BASE, ORIGIN)).toBe(
      'https://telly.jpc.io/streams/1.ts',
    );
    expect(resolveStreamUrl('/streams/1.ts', BASE, ORIGIN)).toBe('/streams/1.ts');
    const proxied = `${BASE}${encodeURIComponent('http://p/1')}`;
    expect(resolveStreamUrl(proxied, BASE, ORIGIN)).toBe(proxied);
  });

  it('with no origin known (or an unparsable url) every non-local url is proxied', () => {
    expect(resolveStreamUrl('http://p/1', BASE, null)).toBe(`${BASE}${encodeURIComponent('http://p/1')}`);
    expect(resolveStreamUrl('http://[bad', BASE, ORIGIN)).toBe(`${BASE}${encodeURIComponent('http://[bad')}`);
  });

  it('defaults the origin to the page location', () => {
    const here = `${location.origin}/x.ts`;
    expect(resolveStreamUrl(here, BASE)).toBe(here);
    expect(resolveStreamUrl('http://elsewhere/x.ts', BASE)).toBe(
      `${BASE}${encodeURIComponent('http://elsewhere/x.ts')}`,
    );
  });
});

describe('streamUrlResolver + resolvingFetch', () => {
  it('reads the setting live on every call', () => {
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    const resolve = streamUrlResolver(settings);
    expect(resolve('http://p/1')).toBe('http://p/1');
    settings.set(TellySettings.CORS_PROXY, BASE);
    expect(resolve('http://p/1')).toBe(`${BASE}${encodeURIComponent('http://p/1')}`);
    settings.set(TellySettings.CORS_PROXY, '');
    expect(resolve('http://p/1')).toBe('http://p/1');
    expect(streamUrlResolver()('http://p/2')).toBe('http://p/2');
  });

  it('resolvingFetch rewrites the request url and forwards init', async () => {
    const inner = vi.fn(() => Promise.resolve(new Response('x')));
    const fetchImpl = resolvingFetch((url) => `${url}#p`, inner);
    await fetchImpl('http://p/seg.ts', { method: 'GET' });
    expect(inner).toHaveBeenCalledWith('http://p/seg.ts#p', { method: 'GET' });
  });

  it('resolvingFetch uses the global fetch by default', async () => {
    const stub = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', stub);
    await resolvingFetch((url) => url)('http://p/1');
    expect(stub).toHaveBeenCalledWith('http://p/1', undefined);
    vi.unstubAllGlobals();
  });
});
