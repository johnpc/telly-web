import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createKeyboardBridge } from '@/core/input/keyboardBridge';
import { KeyRouter } from '@/core/input/keyRouter';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { bootWebOS, isWebOS, platformBack, type WebOSHost } from './webos';

const LG_UA =
  'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36 WebAppManager';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36';

interface FakeHost extends WebOSHost {
  readonly document: EventTarget & { visibilityState: DocumentVisibilityState };
  readonly window: EventTarget & { focus: Mock<() => void> };
  readonly platformBack: Mock<() => void>;
}

function fakeHost(userAgent = LG_UA, withPlatformBack = true): FakeHost {
  const platformBack = vi.fn<() => void>();
  return {
    userAgent,
    webOS: withPlatformBack ? { platformBack } : {},
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState }),
    window: Object.assign(new EventTarget(), { focus: vi.fn<() => void>() }),
    platformBack,
  };
}

/** webOS 4–6 remotes: Back as code 461 with an unnamed `key`. */
function tvKey(keyCode: number, key = 'Unidentified'): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, keyCode, cancelable: true, bubbles: true });
}

let teardown: (() => void) | null = null;
afterEach(() => {
  teardown?.();
  teardown = null;
});

describe('isWebOS', () => {
  it('recognises the LG user agent (with the zero) and the webOSTV.js global', () => {
    expect(isWebOS({ userAgent: LG_UA, webOS: undefined })).toBe(true);
    expect(isWebOS({ userAgent: 'Mozilla/5.0 (webOS/3.0.5; U; en-US)', webOS: undefined })).toBe(true);
    expect(isWebOS({ userAgent: DESKTOP_UA, webOS: {} })).toBe(true);
  });
  it('is false for every other browser', () => {
    expect(isWebOS({ userAgent: DESKTOP_UA, webOS: undefined })).toBe(false);
  });
});

describe('bootWebOS off a TV', () => {
  it('reads the real browser by default and stays a no-op there (jsdom is not a TV)', () => {
    expect(bootWebOS()).toBeNull();
  });
  it('installs nothing and returns null', () => {
    const host: WebOSHost = { ...fakeHost(DESKTOP_UA), webOS: undefined };
    const add = vi.spyOn(host.window, 'addEventListener');
    expect(bootWebOS(host)).toBeNull();
    expect(add).not.toHaveBeenCalled();
  });
});

describe('bootWebOS on a TV: lifecycle', () => {
  it('re-focuses the window on webOSRelaunch and when the app becomes visible again', () => {
    const host = fakeHost();
    teardown = bootWebOS(host);
    host.document.dispatchEvent(new Event('webOSRelaunch'));
    expect(host.window.focus).toHaveBeenCalledTimes(1);
    host.document.visibilityState = 'hidden';
    host.document.dispatchEvent(new Event('visibilitychange'));
    expect(host.window.focus).toHaveBeenCalledTimes(1);
    host.document.visibilityState = 'visible';
    host.document.dispatchEvent(new Event('visibilitychange'));
    expect(host.window.focus).toHaveBeenCalledTimes(2);
  });

  it('the remover detaches every listener', () => {
    const host = fakeHost();
    const stop = bootWebOS(host);
    stop?.();
    host.document.dispatchEvent(new Event('webOSRelaunch'));
    host.document.dispatchEvent(new Event('visibilitychange'));
    expect(host.window.focus).not.toHaveBeenCalled();
  });
});

describe('platformBack', () => {
  it('returns to the launcher through webOSTV.js and reports it', () => {
    const host = fakeHost();
    expect(platformBack(host)).toBe(true);
    expect(host.platformBack).toHaveBeenCalledTimes(1);
  });

  it('does nothing without webOSTV.js, on a TV without platformBack, and in a plain browser', () => {
    expect(platformBack({ ...fakeHost(DESKTOP_UA), webOS: undefined })).toBe(false);
    const bare = fakeHost(LG_UA, false);
    expect(platformBack(bare)).toBe(false);
    expect(bare.platformBack).not.toHaveBeenCalled();
    expect(platformBack()).toBe(false);
  });
});

describe('the key bridge decodes webOS numeric key codes', () => {
  it('routes 461 / 427 / 428 delivered with key Unidentified as BACK / CHANNEL_UP / CHANNEL_DOWN', () => {
    const back = vi.fn();
    const router = new KeyRouter({ moveFocus: () => false, activate: () => false, back });
    const seen: RemoteKey[] = [];
    router.push((key) => {
      if (key === 'BACK') return false;
      seen.push(key);
      return true;
    });
    const bridge = createKeyboardBridge(router);
    for (const code of [461, 427, 428]) bridge.onKeyDown(tvKey(code));
    bridge.onKeyDown(tvKey(461, ''));
    expect(back).toHaveBeenCalledTimes(2);
    expect(seen).toEqual(['CHANNEL_UP', 'CHANNEL_DOWN']);
  });
});
