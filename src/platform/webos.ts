// LG webOS runtime glue. Detects a webOS TV at boot and is a no-op anywhere
// else (ONE build serves every target — see ./index.ts). On a TV it:
//  - keeps input alive across the TV's lifecycle events: `webOSRelaunch` (the
//    app was picked from the launcher while already running) and a
//    `visibilitychange` back to visible re-focus the window so the remote's
//    keys reach the key bridge again. The stream itself is already stopped /
//    re-tuned by `features/playback/lifecycle/useVisibilitySuspend`.
//  - hands the exit to the platform: the shell (`RootScreen`, the one owner of
//    "BACK at the root") calls `platformBack()` via `src/platform/exit.ts`;
//    `webOS.platformBack()` returns to the launcher with the live screen still
//    mounted for the relaunch, and only when webOS is absent does the shell
//    show its own `Exited` frame. (webOS sends BACK as key code 461, often with
//    `key: 'Unidentified'` — `decodeRemoteKey` reads the code.)

/** The `window.webOS` object webOSTV.js installs (only the member we use). */
export interface WebOSGlobal {
  platformBack?: () => void;
}

interface Listenable {
  addEventListener(type: string, listener: (e: Event) => void): void;
  removeEventListener(type: string, listener: (e: Event) => void): void;
}

/** The slice of the browser the module touches; tests pass fakes. */
export interface WebOSHost {
  readonly userAgent: string;
  readonly webOS: WebOSGlobal | undefined;
  readonly document: Listenable & { readonly visibilityState: DocumentVisibilityState };
  readonly window: Listenable & { focus(): void };
}

/** LG's user agent reads `(Web0S; Linux/SmartTV)` — with a zero; `window.webOS` is webOSTV.js. */
export function isWebOS(host: Pick<WebOSHost, 'userAgent' | 'webOS'>): boolean {
  return host.webOS !== undefined || /web0s|webos/i.test(host.userAgent);
}

/** Returns to the TV launcher; false (nothing happened) off webOS or without webOSTV.js. */
export function platformBack(host: Pick<WebOSHost, 'userAgent' | 'webOS'> = browserHost()): boolean {
  if (host.webOS?.platformBack === undefined) return false;
  host.webOS.platformBack();
  return true;
}

function browserHost(): WebOSHost {
  const win = window as unknown as { webOS?: WebOSGlobal };
  return { userAgent: navigator.userAgent, webOS: win.webOS, document, window };
}

type Binding = readonly [target: Listenable, type: string, listener: (e: Event) => void];

function bind(bindings: readonly Binding[]): () => void {
  for (const [target, type, listener] of bindings) target.addEventListener(type, listener);
  return () => {
    for (const [target, type, listener] of bindings) target.removeEventListener(type, listener);
  };
}

/**
 * Installs the webOS listeners when running on a webOS TV; returns their
 * remover, or null (nothing installed) on every other platform.
 */
export function bootWebOS(host: WebOSHost = browserHost()): (() => void) | null {
  if (!isWebOS(host)) return null;
  const wake = (): void => host.window.focus();
  const onVisibility = (): void => {
    if (host.document.visibilityState === 'visible') wake();
  };
  return bind([
    [host.document, 'webOSRelaunch', wake],
    [host.document, 'visibilitychange', onVisibility],
  ]);
}
