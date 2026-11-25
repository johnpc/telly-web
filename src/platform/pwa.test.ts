import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TV_SAFE_AREA_CLASS,
  applyPwaPlan,
  bootPwa,
  isXbox,
  planPwaBoot,
  windowHost,
  type PwaHost,
} from './pwa';
import { PwaUpdate, type UpdateHost } from './pwaUpdate';

const XBOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edge/122.0.0.0';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36';
const VERSION = 'cafe0042';

/** A registration the way `register()` resolves one: nothing installing or waiting. */
function registration(): ServiceWorkerRegistration {
  return Object.assign(new EventTarget(), {
    installing: null,
    waiting: null,
  }) as unknown as ServiceWorkerRegistration;
}

function container(register = vi.fn().mockResolvedValue(registration())): ServiceWorkerContainer {
  return Object.assign(new EventTarget(), {
    register,
    controller: null,
  }) as unknown as ServiceWorkerContainer;
}

function host(extra: Partial<PwaHost> = {}): PwaHost {
  return {
    userAgent: DESKTOP_UA,
    search: '',
    dev: false,
    baseUrl: '/',
    version: VERSION,
    serviceWorker: container(),
    ...extra,
  };
}

afterEach(() => {
  document.documentElement.classList.remove(TV_SAFE_AREA_CLASS);
  vi.restoreAllMocks();
});

describe('isXbox', () => {
  it('recognises the console user agents only', () => {
    expect(isXbox(XBOX_UA)).toBe(true);
    expect(isXbox('Mozilla/5.0 (Xbox; Xbox One)')).toBe(true);
    expect(isXbox(DESKTOP_UA)).toBe(false);
    expect(isXbox('xboxish-browser')).toBe(false);
  });
});

describe('planPwaBoot', () => {
  it('registers the worker at <base>sw.js?v=<shell version> in a production build', () => {
    expect(planPwaBoot(host())).toEqual({
      xboxSafeArea: false,
      serviceWorker: 'register',
      scriptUrl: `/sw.js?v=${VERSION}`,
    });
    expect(planPwaBoot(host({ baseUrl: '/telly-web/' })).scriptUrl).toBe(`/telly-web/sw.js?v=${VERSION}`);
  });

  it('never registers under the dev server or the e2e harness', () => {
    expect(planPwaBoot(host({ dev: true })).serviceWorker).toBe('skip-dev');
    expect(planPwaBoot(host({ search: '?e2e=1' })).serviceWorker).toBe('skip-test');
    expect(planPwaBoot(host({ search: '?e2e' })).serviceWorker).toBe('skip-test');
    expect(planPwaBoot(host({ search: '?other=1' })).serviceWorker).toBe('register');
  });

  it('reports a browser without service workers', () => {
    expect(planPwaBoot(host({ serviceWorker: undefined })).serviceWorker).toBe('unsupported');
  });

  it('reserves the TV-safe area on an Xbox only', () => {
    expect(planPwaBoot(host({ userAgent: XBOX_UA })).xboxSafeArea).toBe(true);
    expect(planPwaBoot(host()).xboxSafeArea).toBe(false);
  });
});

describe('applyPwaPlan', () => {
  it('toggles the safe-area class on <html>, registers the worker and hands it to the update machine', async () => {
    const reg = registration();
    const register = vi.fn().mockResolvedValue(reg);
    const h = host({ userAgent: XBOX_UA, serviceWorker: container(register) });
    const updates = new PwaUpdate();
    const watch = vi.spyOn(updates, 'watch').mockReturnValue(() => undefined);
    await applyPwaPlan(planPwaBoot(h), document.documentElement, h, updates);
    expect(document.documentElement.classList.contains(TV_SAFE_AREA_CLASS)).toBe(true);
    expect(register).toHaveBeenCalledWith(`/sw.js?v=${VERSION}`);
    expect(watch).toHaveBeenCalledWith(expect.objectContaining({ version: VERSION }), reg);
  });

  it('builds the machine’s host over the real container: versioned re-registration and a live document check', async () => {
    const register = vi.fn().mockResolvedValue(registration());
    const h = host({ baseUrl: '/telly-web/', serviceWorker: container(register) });
    const updates = new PwaUpdate();
    let seen: UpdateHost | undefined;
    vi.spyOn(updates, 'watch').mockImplementation((updateHost) => {
      seen = updateHost;
      return () => undefined;
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html></html>'));
    await applyPwaPlan(planPwaBoot(h), document.documentElement, h, updates);
    await seen?.register('feed0001');
    expect(register).toHaveBeenLastCalledWith('/telly-web/sw.js?v=feed0001');
    await seen?.liveVersion();
    expect(fetchSpy).toHaveBeenCalledWith('/telly-web/?shell=live', { cache: 'no-store' });
    expect(seen?.container).toBe(h.serviceWorker);
    expect(seen?.document).toBe(document);
  });

  it('removes a stale class and skips registration when the plan says so', async () => {
    document.documentElement.classList.add(TV_SAFE_AREA_CLASS);
    const register = vi.fn();
    const h = host({ dev: true, serviceWorker: container(register) });
    await applyPwaPlan(planPwaBoot(h), document.documentElement, h);
    expect(document.documentElement.classList.contains(TV_SAFE_AREA_CLASS)).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the plan registers but the container is missing', async () => {
    const h = host({ serviceWorker: undefined });
    await expect(
      applyPwaPlan({ ...planPwaBoot(host()), scriptUrl: '/sw.js' }, document.documentElement, h),
    ).resolves.toBeUndefined();
  });

  it('survives a failed registration with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const register = vi.fn().mockRejectedValue(new Error('insecure origin'));
    const h = host({ serviceWorker: container(register) });
    await applyPwaPlan(planPwaBoot(h), document.documentElement, h);
    expect(warn).toHaveBeenCalledWith('telly: service worker registration failed', expect.any(Error));
  });
});

describe('window bootstrap', () => {
  it('reads the real window and never registers under vitest (dev build)', () => {
    const h = windowHost();
    expect(h.dev).toBe(true);
    expect(h.baseUrl).toBe('/');
    expect(h.userAgent).toBe(navigator.userAgent);
    expect(h.version).toMatch(/^[0-9a-f]{8}$/);
    expect(() => bootPwa()).not.toThrow();
    expect(document.documentElement.classList.contains(TV_SAFE_AREA_CLASS)).toBe(false);
  });
});
