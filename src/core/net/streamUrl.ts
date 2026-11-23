import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';

/**
 * THE stream-URL resolver. On the web the "Stream & CORS proxy" setting
 * routes every media request — live tune, catch-up archive, VOD, multiview
 * panes, DVR captures — through `${proxyBase}${encodeURIComponent(url)}`:
 * an https page can neither follow a provider's plain-http redirect (mixed
 * content) nor read a CORS-less response, and the proxy does both server-side.
 * Logos and images never come through here; the playlist/EPG fetchers keep
 * their own `proxied` (same base, no same-origin exemption needed).
 */
export type StreamUrlResolver = (url: string) => string;

const LOCAL_SCHEMES = /^(blob|data):/i;

function currentOrigin(): string | null {
  return typeof location === 'undefined' ? null : location.origin;
}

/** Blob / data / same-origin / already-proxied URLs stay as they are; anything else is proxied once a base is set. */
export function resolveStreamUrl(
  url: string,
  proxyBase: string | undefined,
  origin: string | null = currentOrigin(),
): string {
  const base = proxyBase?.trim() ?? '';
  if (base === '' || LOCAL_SCHEMES.test(url) || url.startsWith(base)) return url;
  return isSameOrigin(url, origin) ? url : `${base}${encodeURIComponent(url)}`;
}

function isSameOrigin(url: string, origin: string | null): boolean {
  if (origin === null) return false;
  try {
    return new URL(url, origin).origin === origin;
  } catch {
    return false;
  }
}

/** A resolver reading the setting LIVE on every call, so a proxy discovered after start applies to the next tune. */
export function streamUrlResolver(
  settings: SettingsRepository = defaultSettingsRepository,
): StreamUrlResolver {
  return (url) => resolveStreamUrl(url, settings.get(TellySettings.CORS_PROXY));
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const globalFetch: FetchLike = (input, init) => fetch(input, init);

/** `fetch` with the resolver applied to every request URL (DVR captures: playlists, segments and raw pipes alike). */
export function resolvingFetch(resolve: StreamUrlResolver, fetchImpl: FetchLike = globalFetch): FetchLike {
  return (input, init) => fetchImpl(resolve(input), init);
}
