// One HEAD request answers both "what is this extensionless provider URL?"
// (Content-Type → engine choice) and "is this `.ts` a file or a live pipe?"
// (Content-Length present → finite file; chunked / absent → live). Failures
// (no CORS on HEAD, 405, timeout) resolve to an all-null probe so callers
// fall back to the URL's extension and the caller-declared `live` flag.

export interface UrlProbe {
  ok: boolean;
  contentType: string | null;
  contentLength: number | null;
}

export const PROBE_TIMEOUT_MS = 4_000;

export const UNKNOWN_PROBE: UrlProbe = { ok: false, contentType: null, contentLength: null };

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function defaultFetch(): FetchLike | null {
  return typeof fetch === 'function' ? (input, init) => fetch(input, init) : null;
}

export async function probeUrl(url: string, fetchImpl: FetchLike | null = defaultFetch()): Promise<UrlProbe> {
  if (fetchImpl === null) return UNKNOWN_PROBE;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { method: 'HEAD', signal: controller.signal });
    if (!response.ok) return UNKNOWN_PROBE;
    return {
      ok: true,
      contentType: mediaType(response.headers.get('content-type')),
      contentLength: lengthOf(response.headers.get('content-length')),
    };
  } catch {
    return UNKNOWN_PROBE;
  } finally {
    clearTimeout(timer);
  }
}

/** "video/mp2t; charset=x" → "video/mp2t". */
function mediaType(header: string | null): string | null {
  if (header === null) return null;
  const type = (header.split(';')[0] ?? '').trim().toLowerCase();
  return type === '' ? null : type;
}

function lengthOf(header: string | null): number | null {
  if (header === null) return null;
  const n = Number.parseInt(header, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** The HEAD fallback for extensionless provider URLs; null when unknowable. */
export async function sniffContentType(url: string, fetchImpl?: FetchLike | null): Promise<string | null> {
  return (await probeUrl(url, fetchImpl)).contentType;
}
