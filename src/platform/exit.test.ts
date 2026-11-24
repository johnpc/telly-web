import { afterEach, describe, expect, it, vi } from 'vitest';
import { exitToPlatform } from './exit';

interface Host {
  tizen?: unknown;
  webOS?: unknown;
}
const host = globalThis as Host;

describe('exitToPlatform', () => {
  afterEach(() => {
    delete host.tizen;
    delete host.webOS;
  });

  it('is false in a plain browser, so the shell shows its own Exited route', () => {
    expect(exitToPlatform()).toBe(false);
  });

  it('exits through Tizen when its application API is present', () => {
    const exit = vi.fn();
    host.tizen = { application: { getCurrentApplication: () => ({ exit }) } };
    expect(exitToPlatform()).toBe(true);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('returns to the webOS launcher when webOSTV.js is present', () => {
    const platformBack = vi.fn();
    host.webOS = { platformBack };
    expect(exitToPlatform()).toBe(true);
    expect(platformBack).toHaveBeenCalledTimes(1);
  });
});
