/**
 * Downloads an M3U playlist body (Android `M3uFetcher`). Web honesty: a
 * browser can neither set the `User-Agent` header nor read a provider that
 * sends no CORS headers, so the per-playlist/global User-Agent settings are
 * kept only for backup parity, and `proxied` routes the request through the
 * user's CORS proxy (Settings -> General -> CORS proxy) when one is set.
 */
export interface FetchOptions {
  /** The CORS proxy base; '' or undefined fetches the URL directly. */
  proxyBase?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** `${proxyBase}${encodeURIComponent(url)}` when a proxy base is set, else the URL itself. */
export function proxied(url: string, proxyBase: string | undefined): string {
  const base = proxyBase?.trim() ?? '';
  return base === '' ? url : `${base}${encodeURIComponent(url)}`;
}

async function fetchOk(url: string, what: string, options: FetchOptions): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const init: RequestInit = options.signal === undefined ? {} : { signal: options.signal };
  const response = await fetchImpl(proxied(url, options.proxyBase), init);
  if (!response.ok) throw new Error(`HTTP ${response.status} while downloading ${what}`);
  return response;
}

/** Returns the playlist body, or throws on any HTTP failure. */
export async function fetchPlaylistText(url: string, options: FetchOptions = {}): Promise<string> {
  return (await fetchOk(url, 'playlist', options)).text();
}

/** Returns a response body as bytes (EPG documents may be gzip-compressed). */
export async function fetchBytes(url: string, what: string, options: FetchOptions = {}): Promise<Uint8Array> {
  return new Uint8Array(await (await fetchOk(url, what, options)).arrayBuffer());
}
