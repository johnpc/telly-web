import type { CatchupAttributes } from './catchupAttributes';

/** Epoch/duration millis to the whole seconds catch-up URLs carry. */
export function seconds(ms: number): number {
  return Math.trunc(ms / 1000);
}

/** Substitutes the community placeholders of a `catchup-source` template (`{x}` and `${x}`). */
export function expandTemplate(template: string, startMs: number, endMs: number, nowMs: number): string {
  const start = seconds(startMs);
  const now = seconds(nowMs);
  const values: Record<string, number> = {
    utc: start,
    start,
    lutc: now,
    now,
    timestamp: now,
    offset: now - start,
    duration: seconds(endMs - startMs),
  };
  // "${x}" first: replacing the inner "{x}" first would strand the "$".
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`\${${key}}`, String(value)).replaceAll(`{${key}}`, String(value)),
    template,
  );
}

/** `catchup="shift"`: the live URL with `utc` (start) and `lutc` (now) appended. */
export function shiftUrl(streamUrl: string, startMs: number, nowMs: number): string {
  const separator = streamUrl.includes('?') ? '&' : '?';
  return `${streamUrl}${separator}utc=${seconds(startMs)}&lutc=${seconds(nowMs)}`;
}

/** `catchup="flussonic"`: archive rewrite of the live URL's last path segment. */
export function flussonicUrl(streamUrl: string, startMs: number, endMs: number): string {
  const start = seconds(startMs);
  const duration = seconds(endMs - startMs);
  const queryAt = streamUrl.indexOf('?');
  const base = queryAt < 0 ? streamUrl : streamUrl.slice(0, queryAt);
  const query = streamUrl.slice(base.length);
  const slash = base.lastIndexOf('/');
  const last = base.slice(slash + 1);
  const archive =
    last === 'mpegts'
      ? `archive-${start}-${duration}.ts`
      : last === 'video.m3u8'
        ? `video-${start}-${duration}.m3u8`
        : `archive-${start}-${duration}.m3u8`;
  return `${base.slice(0, slash)}/${archive}${query}`;
}

const XC_LIVE = /^(https?:\/\/[^/]+)(?:\/live)?\/([^/?]+\/[^/?]+)\/(\d+)(?:\.\w+)?(?:\?.*)?$/;

function utcStamp(atMs: number): string {
  const d = new Date(atMs);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}:${p(d.getUTCHours())}-${p(d.getUTCMinutes())}`;
}

/** `catchup="xc"`: Xtream Codes timeshift endpoint; null when the live URL is not the conventional shape. */
export function xtreamUrl(streamUrl: string, startMs: number, endMs: number): string | null {
  const match = XC_LIVE.exec(streamUrl);
  if (match === null) return null;
  const [, host, credentials, id] = match;
  const minutes = Math.floor((endMs - startMs + 60_000 - 1) / 60_000);
  return `${host}/timeshift/${credentials}/${minutes}/${utcStamp(startMs)}/${id}.ts`;
}

/** Channel attributes + programme window + "now" → a playable catch-up URL, or null. */
export function buildCatchupUrl(
  streamUrl: string,
  attributes: CatchupAttributes,
  startMs: number,
  endMs: number,
  nowMs: number,
): string | null {
  const { type, source } = attributes;
  if (type === 'default') return source === null ? null : expandTemplate(source, startMs, endMs, nowMs);
  if (type === 'append')
    return source === null ? null : streamUrl + expandTemplate(source, startMs, endMs, nowMs);
  if (type === 'shift') return shiftUrl(streamUrl, startMs, nowMs);
  if (type === 'flussonic') return flussonicUrl(streamUrl, startMs, endMs);
  return xtreamUrl(streamUrl, startMs, endMs);
}
