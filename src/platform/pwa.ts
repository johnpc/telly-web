/**
 * Installable PWA bootstrap — the Xbox / Microsoft Store packaging target
 * (PWABuilder wraps https://telly.jpc.io into an MSIX; see platforms/xbox).
 * Three concerns: register the app-shell service worker (public/sw.js) in
 * production builds only, hand its registration to the `PWA update` machine
 * (pwaUpdate.ts) so a deploy made while the app runs becomes the "telly was
 * updated" toast, and reserve a TV-safe inset when the host is an Xbox.
 */
import './pwa.css';
import { type PwaUpdate, type UpdateHost, pwaUpdate } from './pwaUpdate';
import { liveShellVersion, shellVersion, workerUrl } from './shellVersion';

/** The slice of the window the bootstrap reads; tests pass plain objects. */
export interface PwaHost {
  userAgent: string;
  /** `location.search` — `?e2e` marks the acceptance harness. */
  search: string;
  /** `import.meta.env.DEV` — the dev server never gets a worker (stale shells while editing). */
  dev: boolean;
  /** `import.meta.env.BASE_URL` — `/` or `/telly-web/`; the worker lives at `<base>sw.js`. */
  baseUrl: string;
  /** The shell version this document runs (`shellVersion`); the worker is registered as `sw.js?v=<version>`. */
  version: string;
  serviceWorker: ServiceWorkerContainer | undefined;
}

export type ServiceWorkerPlan = 'register' | 'skip-dev' | 'skip-test' | 'unsupported';

/** What a boot does: one decision, derived once from the host (web-only machine). */
export interface PwaPlan {
  /** Add the `tv-safe-area` class on `<html>` (Xbox renders to the full TV). */
  xboxSafeArea: boolean;
  serviceWorker: ServiceWorkerPlan;
  /** The worker script URL when `serviceWorker` is `register`. */
  scriptUrl: string;
}

/** Class on `<html>` that `pwa.css` turns into the `--tv-safe-inset` padding on `#root`. */
export const TV_SAFE_AREA_CLASS = 'tv-safe-area';

/** Edge and WebView2 on the console identify as `… Xbox; Xbox One/Series X …`. */
export function isXbox(userAgent: string): boolean {
  return /\bXbox\b/i.test(userAgent);
}

// @stateMachine('PWA boot')
export function planPwaBoot(host: PwaHost): PwaPlan {
  return {
    xboxSafeArea: isXbox(host.userAgent),
    serviceWorker: serviceWorkerPlan(host),
    scriptUrl: workerUrl(host.baseUrl, host.version),
  };
}

function serviceWorkerPlan(host: PwaHost): ServiceWorkerPlan {
  if (host.dev) return 'skip-dev';
  if (new URLSearchParams(host.search).has('e2e')) return 'skip-test';
  if (!host.serviceWorker) return 'unsupported';
  return 'register';
}

/** Applies a plan to the DOM and the service-worker container; resolves once registration settled. */
export async function applyPwaPlan(
  plan: PwaPlan,
  root: HTMLElement,
  host: PwaHost,
  updates: PwaUpdate = pwaUpdate,
): Promise<void> {
  root.classList.toggle(TV_SAFE_AREA_CLASS, plan.xboxSafeArea);
  if (plan.serviceWorker !== 'register' || !host.serviceWorker) return;
  try {
    const registration = await host.serviceWorker.register(plan.scriptUrl);
    updates.watch(updateHost(host, host.serviceWorker), registration);
  } catch (error: unknown) {
    // A failed registration leaves a perfectly working (non-installable) web app behind.
    console.warn('telly: service worker registration failed', error);
  }
}

/** The update machine's view of this window. */
function updateHost(host: PwaHost, container: ServiceWorkerContainer): UpdateHost {
  return {
    container,
    document,
    version: host.version,
    liveVersion: () => liveShellVersion(host.baseUrl),
    register: (version) => container.register(workerUrl(host.baseUrl, version)),
    reload: () => window.location.reload(),
  };
}

export function windowHost(): PwaHost {
  return {
    userAgent: navigator.userAgent,
    search: window.location.search,
    dev: import.meta.env.DEV,
    baseUrl: import.meta.env.BASE_URL,
    version: shellVersion(document, import.meta.env.BASE_URL),
    serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  };
}

/** Called once from `bootPlatform()`; a no-op everywhere the plan says so. */
export function bootPwa(): void {
  const host = windowHost();
  void applyPwaPlan(planPwaBoot(host), document.documentElement, host);
}
