// Two probes for provider URLs. `probeUrl` asks "is this `.ts` a file or a
// live pipe?" (Content-Length present → finite file; chunked / absent → live)
// with a ranged GET whose body is dropped unread — never a HEAD: measured
// 2026-11-23, a provider treats HEAD as an open session, and the GET that
// follows it is starved to ~50 KB/2 s until that phantom session times out,
// whereas a cancelled GET closes the upstream at once. `sniffStream` decides the engine for an EXTENSIONLESS url
// with a small ranged GET: the first bytes name the container (providers
// label raw MPEG-TS as `video/mp4`), and only an undecided body falls back
// to the Content-Type. Failures (no CORS, 405, timeout) resolve to the
// unknown probe / null so callers fall back to the URL and the declared
// `live` flag.
import { CONTAINER_TYPES, SNIFF_BYTES, sniffContainer } from './containerSniff';
import { recallProbe, rememberProbe } from './probeMemo';

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

/** Runs `request` against a fetch with the probe timeout; any failure yields `fallback`. */
async function timed<T>(
  fetchImpl: FetchLike | null,
  fallback: T,
  request: (fetchImpl: FetchLike, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (fetchImpl === null) return fallback;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await request(fetchImpl, controller.signal);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** The headers a probe cares about, as `UrlProbe`. */
function probeOf(response: Response): UrlProbe {
  return {
    ok: true,
    contentType: mediaType(response.headers.get('content-type')),
    contentLength: lengthOf(response.headers.get('content-length')),
  };
}

export function probeUrl(url: string, fetchImpl: FetchLike | null = defaultFetch()): Promise<UrlProbe> {
  const remembered = recallProbe(url);
  if (remembered !== null) return Promise.resolve(remembered);
  return timed(fetchImpl, UNKNOWN_PROBE, async (f, signal) => {
    const response = await f(url, { headers: rangeHeader(), signal });
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok) return UNKNOWN_PROBE;
    const probe = probeOf(response);
    rememberProbe(url, probe);
    return probe;
  });
}

function rangeHeader(): Record<string, string> {
  return { Range: `bytes=0-${SNIFF_BYTES - 1}` };
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

type ByteReader = ReadableStreamDefaultReader<Uint8Array>;

/** Copies what fits of `chunk` into `out` at `at`; returns the new fill level. */
function append(out: Uint8Array, at: number, chunk: Uint8Array): number {
  const take = chunk.subarray(0, out.length - at);
  out.set(take, at);
  return at + take.byteLength;
}

/** Copies chunks into `out` until it is full or the stream ends; returns the bytes copied. */
async function fill(reader: ByteReader, out: Uint8Array): Promise<number> {
  let total = 0;
  while (total < out.length) {
    const { done, value } = await reader.read();
    if (done) break;
    total = append(out, total, value);
  }
  return total;
}

/** Reads up to `limit` body bytes, then cancels the stream (a live pipe that ignores Range never ends). */
async function readHead(response: Response, limit: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (reader === undefined) return new Uint8Array(await response.arrayBuffer()).subarray(0, limit);
  const out = new Uint8Array(limit);
  try {
    return out.subarray(0, await fill(reader, out));
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

/** The media type of an extensionless url: sniffed from the first 8 TS packets, else the server's Content-Type; null when unknowable. */
export function sniffStream(
  url: string,
  fetchImpl: FetchLike | null = defaultFetch(),
): Promise<string | null> {
  return timed(fetchImpl, null, async (f, signal) => {
    const response = await f(url, { headers: rangeHeader(), signal });
    if (!response.ok) return null;
    rememberProbe(url, probeOf(response));
    const container = sniffContainer(await readHead(response, SNIFF_BYTES));
    return container === null ? mediaType(response.headers.get('content-type')) : CONTAINER_TYPES[container];
  });
}
