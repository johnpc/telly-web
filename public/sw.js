/* telly service worker — the installable (Xbox / Microsoft Store) shell.
 *
 * Caches ONLY the app shell: the start document (network-first, so a new deploy
 * is never stale; the cached copy is the offline fallback), the manifest and
 * icons, and Vite's content-hashed `assets/*` (cache-first — a hash never
 * changes meaning). Everything else — playlists, EPG, streams, logos, anything
 * under /proxy/ or on another origin — is not intercepted at all. A new deploy
 * changes the start document; when that is noticed the old hashed assets are
 * dropped so the cache never grows across releases.
 *
 * Taking over is the PAGE's decision, not this file's: a newly installed
 * worker waits until the page posts `{ type: 'skipWaiting' }` (the one
 * mechanism — there is no install-time skipWaiting), then `clients.claim`
 * raises `controllerchange` and the page reloads into the new shell. The page
 * (src/platform/pwaUpdate.ts) sends it at once when it already runs the shell
 * the worker was registered for, and only after the user accepts the
 * "telly was updated" toast otherwise.
 *
 * Registered by src/platform/pwa.ts in production builds only (never in dev
 * or under the e2e harness) as `sw.js?v=<shell version>`: this script never
 * changes between deploys, the version in its URL does, so a deploy is a new
 * worker. The scope is wherever the app is served from (`/` on telly.jpc.io,
 * `/telly-web/` on GitHub Pages).
 */
const SHELL_CACHE = 'telly-shell-v1';
const scope = new URL(self.registration.scope);
const SHELL_KEY = new URL('./', scope).href;
const SHELL_URLS = ['./', 'manifest.webmanifest', 'icon.png', 'icon-192.png', 'icon-512.png'].map(
  (p) => new URL(p, scope).href,
);
const ASSETS_PREFIX = new URL('assets/', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => precacheShell(cache)));
});

/** The page's go-ahead to replace the controlling worker (see the header). */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(shellNetworkFirst(request));
    return;
  }
  if (url.href.startsWith(ASSETS_PREFIX) || SHELL_URLS.includes(url.href)) {
    event.respondWith(cacheFirst(request));
  }
  // Anything else passes straight through to the network, untouched.
});

/** Fresh document when online (and remember it); the last known shell when offline. */
async function shellNetworkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await rememberShell(cache, fresh.clone());
    return fresh;
  } catch {
    const shell = await cache.match(SHELL_KEY, { ignoreVary: true });
    return shell ?? new Response('telly is offline and has not been cached yet.', { status: 503 });
  }
}

/**
 * The first page load is not controlled by the worker, so the hashed entry
 * files it loads would never pass through `fetch` — read them out of the start
 * document at install time instead. Lazy chunks (hls.js, mpegts.js) are cached
 * the first time a controlled page asks for them.
 */
async function precacheShell(cache) {
  const document = await fetch(SHELL_KEY, { cache: 'no-cache' });
  if (!document.ok) throw new Error(`telly shell ${document.status}`);
  const html = await document.clone().text();
  await cache.put(SHELL_KEY, document);
  await cache.addAll([...SHELL_URLS.filter((u) => u !== SHELL_KEY), ...referencedAssets(html)]);
}

/** `src`/`href` values under `assets/` in the start document (Vite's hashed entry chunk and stylesheet). */
function referencedAssets(html) {
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const href = new URL(match[1], scope).href;
    if (href.startsWith(ASSETS_PREFIX)) urls.add(href);
  }
  return [...urls];
}

/** Store the document under the one shell key; a changed document means a new deploy → swap the assets. */
async function rememberShell(cache, response) {
  const previous = await cache.match(SHELL_KEY);
  const [before, after] = await Promise.all([previous ? previous.text() : null, response.clone().text()]);
  await cache.put(SHELL_KEY, response);
  if (before === null || before === after) return;
  await pruneAssets(cache);
  await cache.addAll(referencedAssets(after)).catch(() => undefined); // best effort; cache-first fills the rest
}

async function pruneAssets(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.filter((k) => k.url.startsWith(ASSETS_PREFIX)).map((k) => cache.delete(k)));
}

/** `ignoreVary`: a module script sends an `Origin` header the install-time fetch did not, and hosts answer `Vary: Origin`. */
async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
