/**
 * Downloads an M3U playlist body (Android `M3uFetcher`). Web honesty: a
 * browser can neither set the `User-Agent` header nor read a provider that
 * sends no CORS headers, so the per-playlist/global User-Agent settings are
 * kept only for backup parity, and `proxied` routes the request through the
 * user's CORS proxy (Settings -> General -> CORS proxy) when one is set.
 */
import { resolveStreamUrl } from '@/core/net/streamUrl';

export interface FetchOptions {
  /** The CORS proxy base; '' or undefined fetches the URL directly. */
  proxyBase?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** The proxied form of a feed URL (same rules as streams: same-origin / blob / already-proxied stay direct). */
export function proxied(url: string, proxyBase: string | undefined): string {
  return resolveStreamUrl(url, proxyBase);
}

/**
 * Feeds are fetched DIRECTLY first (a CORS-enabled https source needs no help)
 * and only fall back to the proxy when the direct request cannot complete at
 * all — a CORS or mixed-content block surfaces as a network error, never as an
 * HTTP status. An HTTP error from the source itself is reported as such.
 */
async function fetchOk(url: string, what: string, options: FetchOptions): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const init: RequestInit = options.signal === undefined ? {} : { signal: options.signal };
  const response = await directThenProxy(url, proxied(url, options.proxyBase), (u) => fetchImpl(u, init));
  if (!response.ok) throw new Error(`HTTP ${response.status} while downloading ${what}`);
  return response;
}

/** The direct request, or — when it cannot complete at all and a proxied form exists — that one. */
async function directThenProxy(
  direct: string,
  viaProxy: string,
  request: (url: string) => Promise<Response>,
): Promise<Response> {
  try {
    return await request(direct);
  } catch (error) {
    if (viaProxy === direct) throw error;
    return request(viaProxy);
  }
}

/** Returns the playlist body, or throws on any HTTP failure. */
export async function fetchPlaylistText(url: string, options: FetchOptions = {}): Promise<string> {
  return (await fetchOk(url, 'playlist', options)).text();
}

/** Returns a response body as bytes (EPG documents may be gzip-compressed). */
export async function fetchBytes(url: string, what: string, options: FetchOptions = {}): Promise<Uint8Array> {
  return new Uint8Array(await (await fetchOk(url, what, options)).arrayBuffer());
}
