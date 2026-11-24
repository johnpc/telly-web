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

const XBOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edge/122.0.0.0';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0 Safari/537.36';

function container(register = vi.fn().mockResolvedValue(undefined)): ServiceWorkerContainer {
  return { register } as unknown as ServiceWorkerContainer;
}

function host(extra: Partial<PwaHost> = {}): PwaHost {
  return {
    userAgent: DESKTOP_UA,
    search: '',
    dev: false,
    baseUrl: '/',
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
  it('registers the worker at <base>sw.js in a production build', () => {
    expect(planPwaBoot(host())).toEqual({
      xboxSafeArea: false,
      serviceWorker: 'register',
      scriptUrl: '/sw.js',
    });
    expect(planPwaBoot(host({ baseUrl: '/telly-web/' })).scriptUrl).toBe('/telly-web/sw.js');
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
  it('toggles the safe-area class on <html> and registers the worker', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const h = host({ userAgent: XBOX_UA, serviceWorker: container(register) });
    await applyPwaPlan(planPwaBoot(h), document.documentElement, h);
    expect(document.documentElement.classList.contains(TV_SAFE_AREA_CLASS)).toBe(true);
    expect(register).toHaveBeenCalledWith('/sw.js');
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
    expect(() => bootPwa()).not.toThrow();
    expect(document.documentElement.classList.contains(TV_SAFE_AREA_CLASS)).toBe(false);
  });
});
