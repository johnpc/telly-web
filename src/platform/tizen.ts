/**
 * Samsung Tizen (Smart TV) bootstrap. Detects the Tizen web runtime and asks
 * it for the remote keys it withholds until an app registers them (channel,
 * media transport and Exit). Everywhere else every function is a no-op.
 *
 * The TV delivers the registered keys as `keyCode`s (427/428 channel, 412/417
 * RW/FF, 10252 play-pause, 10009 Return, 10182 Exit, …) which
 * `src/core/input/remoteKeys.ts` decodes; this module never decodes keys.
 *
 * `onExitRequested()` is the seam for leaving the app the Tizen way
 * (`tizen.application.getCurrentApplication().exit()`). The shell does not
 * call it yet: BACK at the root shows the web `Exited` route instead
 * (see docs/release-tizen.md "Known gaps").
 */

/** `tizen.tvinputdevice` — the only member used is `registerKey`. */
export interface TizenInputDevice {
  registerKey(keyName: string): void;
}

/** The slice of `window.tizen` this module touches (Tizen Web Device API). */
export interface TizenApi {
  readonly tvinputdevice?: TizenInputDevice;
  readonly application?: { getCurrentApplication(): { exit(): void } };
}

/** The host globals read here; tests pass a fake, production the real `window`. */
export interface TizenHost {
  readonly tizen?: TizenApi;
  readonly navigator?: { readonly userAgent?: string };
}

/** Keys a Tizen TV app must register before the browser receives them. */
export const TIZEN_TV_KEYS: readonly string[] = [
  'ChannelUp',
  'ChannelDown',
  'MediaPlayPause',
  'MediaRewind',
  'MediaFastForward',
  'MediaPlay',
  'MediaPause',
  'MediaStop',
  // Not `Exit`: registering it would take over the TV's native exit, which must keep working.
];

/** Outcome of `registerTvKeys` — which names the runtime accepted and which it rejected. */
export interface KeyRegistration {
  readonly registered: readonly string[];
  readonly failed: readonly string[];
}

function defaultHost(): TizenHost {
  return globalThis as unknown as TizenHost;
}

/** True inside the Tizen web runtime (`window.tizen`) or a Tizen browser UA. */
export function isTizen(host: TizenHost = defaultHost()): boolean {
  if (host.tizen !== undefined) return true;
  return (host.navigator?.userAgent ?? '').includes('Tizen');
}

/** One key, one try/catch: a rejected name (older TVs lack `MediaPlay`) must not lose the rest. */
function tryRegister(device: TizenInputDevice, name: string): boolean {
  try {
    device.registerKey(name);
    return true;
  } catch (error) {
    console.warn(`[tizen] registerKey(${name}) failed`, error);
    return false;
  }
}

/** Registers every key in `TIZEN_TV_KEYS` and reports which the runtime accepted. */
export function registerTvKeys(host: TizenHost = defaultHost()): KeyRegistration {
  const device = host.tizen?.tvinputdevice;
  if (!device) return { registered: [], failed: [...TIZEN_TV_KEYS] };
  const registered = TIZEN_TV_KEYS.filter((name) => tryRegister(device, name));
  const failed = TIZEN_TV_KEYS.filter((name) => !registered.includes(name));
  return { registered, failed };
}

/**
 * Exits the app through the Tizen application API. Returns true when the
 * runtime was asked to exit; false off-Tizen or when the call threw.
 */
export function onExitRequested(host: TizenHost = defaultHost()): boolean {
  const application = host.tizen?.application;
  if (!application) return false;
  try {
    application.getCurrentApplication().exit();
    return true;
  } catch (error) {
    console.warn('[tizen] exit() failed', error);
    return false;
  }
}

/** Boot hook for `bootPlatform()`: registers the TV keys on Tizen, no-op elsewhere. */
export function bootTizen(host: TizenHost = defaultHost()): void {
  if (!isTizen(host)) return;
  const { registered, failed } = registerTvKeys(host);
  console.info(
    `[tizen] keys registered: ${registered.join(', ') || 'none'}; failed: ${failed.join(', ') || 'none'}`,
  );
}
