import { describe, expect, it, vi } from 'vitest';
import { MemoryKeyValueStore } from '@/core/kv/memoryKeyValueStore';
import { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import {
  createProxyDiscovery,
  type HealthFetch,
  ProxyDiscovery,
  proxyDiscovery,
  proxyEndpoints,
} from './proxyDiscovery';

const ENDPOINTS = proxyEndpoints('https://telly.jpc.io', '/');

function rig(fetchImpl: HealthFetch): { settings: SettingsRepository; discovery: ProxyDiscovery } {
  const settings = new SettingsRepository(new MemoryKeyValueStore());
  return { settings, discovery: new ProxyDiscovery({ settings, endpoints: ENDPOINTS, fetchImpl }) };
}

const ok: HealthFetch = () => Promise.resolve(new Response('ok\n', { status: 200 }));

describe('proxyEndpoints', () => {
  it('joins origin + BASE_URL + proxy/ without doubled slashes', () => {
    expect(ENDPOINTS).toEqual({
      healthz: 'https://telly.jpc.io/proxy/healthz',
      base: 'https://telly.jpc.io/proxy/?url=',
    });
    expect(proxyEndpoints('https://johnpc.github.io', '/telly-web/')).toEqual({
      healthz: 'https://johnpc.github.io/telly-web/proxy/healthz',
      base: 'https://johnpc.github.io/telly-web/proxy/?url=',
    });
    expect(proxyEndpoints('http://127.0.0.1:4173/', '').healthz).toBe('http://127.0.0.1:4173/proxy/healthz');
  });
});

describe('ProxyDiscovery', () => {
  it('Unknown → Probing → Found: a 200 `ok` fills the unset setting and marks the probe done', async () => {
    const fetchImpl = vi.fn(ok);
    const { settings, discovery } = rig(fetchImpl);
    expect(discovery.state).toEqual({ kind: 'Unknown' });
    const pending = discovery.run();
    expect(discovery.state).toEqual({ kind: 'Probing' });
    await expect(pending).resolves.toEqual({ kind: 'Found', base: ENDPOINTS.base });
    expect(settings.get(TellySettings.CORS_PROXY)).toBe(ENDPOINTS.base);
    expect(settings.get(TellySettings.CORS_PROXY_PROBED)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      ENDPOINTS.healthz,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('Absent on a 404, a 200 that is not `ok` (SPA fallback html) or a network error; the setting stays empty', async () => {
    for (const fetchImpl of [
      (): Promise<Response> => Promise.resolve(new Response('nope', { status: 404 })),
      (): Promise<Response> => Promise.resolve(new Response('<!doctype html>', { status: 200 })),
      (): Promise<Response> => Promise.reject(new TypeError('offline')),
    ]) {
      const { settings, discovery } = rig(fetchImpl);
      await expect(discovery.run()).resolves.toEqual({ kind: 'Absent' });
      expect(settings.get(TellySettings.CORS_PROXY)).toBe('');
      expect(settings.get(TellySettings.CORS_PROXY_PROBED)).toBe(true);
    }
  });

  it('a value the user already set is Found without a probe, and a cleared value is never re-probed', async () => {
    const fetchImpl = vi.fn(ok);
    const { settings, discovery } = rig(fetchImpl);
    settings.set(TellySettings.CORS_PROXY, 'https://mine/?u=');
    await expect(discovery.run()).resolves.toEqual({ kind: 'Found', base: 'https://mine/?u=' });
    expect(settings.get(TellySettings.CORS_PROXY_PROBED)).toBe(true);
    settings.set(TellySettings.CORS_PROXY, '');
    const next = new ProxyDiscovery({ settings, endpoints: ENDPOINTS, fetchImpl });
    await expect(next.run()).resolves.toEqual({ kind: 'Absent' });
    expect(settings.get(TellySettings.CORS_PROXY)).toBe('');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('runs once per instance (StrictMode double-invocation is a no-op) and uses the global fetch by default', async () => {
    const fetchImpl = vi.fn(ok);
    const { discovery } = rig(fetchImpl);
    await Promise.all([discovery.run(), discovery.run()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await expect(discovery.run()).resolves.toEqual({ kind: 'Found', base: ENDPOINTS.base });
    const stub = vi.fn(() => Promise.resolve(new Response('ok')));
    vi.stubGlobal('fetch', stub);
    const settings = new SettingsRepository(new MemoryKeyValueStore());
    await new ProxyDiscovery({ settings, endpoints: ENDPOINTS }).run();
    expect(stub).toHaveBeenCalledWith(ENDPOINTS.healthz, expect.anything());
    vi.unstubAllGlobals();
    expect(createProxyDiscovery(settings).state).toEqual({ kind: 'Unknown' });
    expect(proxyDiscovery.state).toEqual({ kind: 'Unknown' });
  });
});
