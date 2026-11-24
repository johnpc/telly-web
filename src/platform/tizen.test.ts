import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TIZEN_TV_KEYS,
  bootTizen,
  isTizen,
  onExitRequested,
  registerTvKeys,
  type TizenApi,
  type TizenHost,
} from './tizen';

interface FakeTizen {
  api: TizenApi;
  registerKey: ReturnType<typeof vi.fn>;
  exit: ReturnType<typeof vi.fn>;
}

function fakeTizen(options: { rejects?: readonly string[]; exitThrows?: boolean } = {}): FakeTizen {
  const registerKey = vi.fn((name: string) => {
    if (options.rejects?.includes(name)) throw new Error(`unknown key ${name}`);
  });
  const exit = vi.fn(() => {
    if (options.exitThrows) throw new Error('exit denied');
  });
  const api: TizenApi = {
    tvinputdevice: { registerKey },
    application: { getCurrentApplication: () => ({ exit }) },
  };
  return { api, registerKey, exit };
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'tizen');
});

describe('isTizen', () => {
  it('detects the Tizen web runtime by window.tizen', () => {
    expect(isTizen({ tizen: {} })).toBe(true);
  });

  it('detects a Tizen browser by its user agent', () => {
    const host: TizenHost = {
      navigator: {
        userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 TV Safari/537.36',
      },
    };
    expect(isTizen(host)).toBe(true);
  });

  it('is false on an ordinary browser, a UA-less host and the jsdom default host', () => {
    expect(isTizen({ navigator: { userAgent: 'Mozilla/5.0 Chrome/131' } })).toBe(false);
    expect(isTizen({ navigator: {} })).toBe(false);
    expect(isTizen({})).toBe(false);
    expect(isTizen()).toBe(false);
  });
});

describe('registerTvKeys', () => {
  it('registers every TV key the runtime withholds, in order', () => {
    const tizen = fakeTizen();
    const result = registerTvKeys({ tizen: tizen.api });
    expect(tizen.registerKey.mock.calls.map((c) => c[0])).toEqual([...TIZEN_TV_KEYS]);
    expect(result).toEqual({ registered: [...TIZEN_TV_KEYS], failed: [] });
    expect(TIZEN_TV_KEYS).toEqual([
      'ChannelUp',
      'ChannelDown',
      'MediaPlayPause',
      'MediaRewind',
      'MediaFastForward',
      'MediaPlay',
      'MediaPause',
      'MediaStop',
    ]);
  });

  it('keeps going when one key is rejected and reports it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tizen = fakeTizen({ rejects: ['MediaPlay', 'MediaPause'] });
    const result = registerTvKeys({ tizen: tizen.api });
    expect(result.failed).toEqual(['MediaPlay', 'MediaPause']);
    expect(result.registered).toEqual(TIZEN_TV_KEYS.filter((k) => !result.failed.includes(k)));
    expect(tizen.registerKey).toHaveBeenCalledTimes(TIZEN_TV_KEYS.length);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('registers nothing without tvinputdevice (no privilege, or not Tizen)', () => {
    expect(registerTvKeys({ tizen: {} })).toEqual({ registered: [], failed: [...TIZEN_TV_KEYS] });
    expect(registerTvKeys({})).toEqual({ registered: [], failed: [...TIZEN_TV_KEYS] });
    expect(registerTvKeys()).toEqual({ registered: [], failed: [...TIZEN_TV_KEYS] });
  });
});

describe('onExitRequested', () => {
  it('asks the Tizen application API to exit', () => {
    const tizen = fakeTizen();
    expect(onExitRequested({ tizen: tizen.api })).toBe(true);
    expect(tizen.exit).toHaveBeenCalledTimes(1);
  });

  it('reports false when exit() throws, and off Tizen', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tizen = fakeTizen({ exitThrows: true });
    expect(onExitRequested({ tizen: tizen.api })).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(onExitRequested({ tizen: {} })).toBe(false);
    expect(onExitRequested({})).toBe(false);
    expect(onExitRequested()).toBe(false);
  });
});

describe('bootTizen', () => {
  it('registers the TV keys on a Tizen host and logs the outcome', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const tizen = fakeTizen();
    bootTizen({ tizen: tizen.api });
    expect(tizen.registerKey).toHaveBeenCalledTimes(TIZEN_TV_KEYS.length);
    expect(info).toHaveBeenCalledWith(expect.stringContaining('ChannelUp'));
  });

  it('logs "none" registered when the UA says Tizen but the device API is missing', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    bootTizen({ navigator: { userAgent: 'Tizen 6.0' } });
    expect(info).toHaveBeenCalledWith(expect.stringContaining('registered: none'));
  });

  it('is a no-op on every other host (nothing touched, nothing logged)', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    bootTizen({ navigator: { userAgent: 'Chrome' } });
    bootTizen();
    expect(info).not.toHaveBeenCalled();
  });

  it('reads window.tizen when no host is passed', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const tizen = fakeTizen();
    Object.defineProperty(globalThis, 'tizen', { value: tizen.api, configurable: true });
    bootTizen();
    expect(tizen.registerKey).toHaveBeenCalledTimes(TIZEN_TV_KEYS.length);
    expect(onExitRequested()).toBe(true);
    expect(info).toHaveBeenCalledTimes(1);
  });
});
