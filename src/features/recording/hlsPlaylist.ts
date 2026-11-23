/**
 * Pure `.m3u8` reader for the HLS capture path (Android `HlsPlaylistParser`):
 * master-vs-media detection, variant lists, segment lists with sequence
 * numbers, target duration, `#EXT-X-ENDLIST` and `#EXT-X-MAP` (fMP4).
 * Relative URIs resolve against the playlist's own URL. No I/O.
 */
export interface HlsVariant {
  url: string;
  bandwidth: number;
}

/** One media segment: playlist-order `sequence` plus its absolute `url`. */
export interface HlsSegment {
  sequence: number;
  url: string;
}

export interface HlsMaster {
  kind: 'master';
  variants: HlsVariant[];
}

/** A non-null `initSegmentUrl` (`#EXT-X-MAP`) marks fMP4 segments: those concatenate into an `.mp4`. */
export interface HlsMedia {
  kind: 'media';
  segments: HlsSegment[];
  targetDurationMs: number;
  ended: boolean;
  initSegmentUrl: string | null;
}

export type HlsPlaylist = HlsMaster | HlsMedia;

const STREAM_INF = '#EXT-X-STREAM-INF';
const MEDIA_SEQUENCE = '#EXT-X-MEDIA-SEQUENCE:';
const TARGET_DURATION = '#EXT-X-TARGETDURATION:';
const MAP = '#EXT-X-MAP:';
const END_LIST = '#EXT-X-ENDLIST';

/** The spec requires TARGETDURATION; a sane poll cadence if it's absent. */
export const DEFAULT_TARGET_DURATION_MS = 6_000;

export function parseHlsPlaylist(text: string, playlistUrl: string): HlsPlaylist {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines.some((line) => line.startsWith(STREAM_INF))
    ? master(lines, playlistUrl)
    : media(lines, playlistUrl);
}

/** Resolves a (possibly relative) playlist reference against `baseUrl`. */
export function resolveHlsUrl(baseUrl: string, reference: string): string {
  try {
    return new URL(reference, baseUrl).toString();
  } catch {
    return reference;
  }
}

/** The highest-bandwidth variant of a master playlist. */
export function bestVariant(playlist: HlsMaster): HlsVariant | null {
  return playlist.variants.reduce<HlsVariant | null>(
    (best, variant) => (best === null || variant.bandwidth > best.bandwidth ? variant : best),
    null,
  );
}

const isUri = (line: string): boolean => !line.startsWith('#');

const bandwidthOf = (streamInf: string): number => Number(/BANDWIDTH=(\d+)/.exec(streamInf)?.[1] ?? 0);

/** Every URI line directly under an `#EXT-X-STREAM-INF` tag is a variant. */
function master(lines: string[], baseUrl: string): HlsMaster {
  const variants = lines.flatMap((line, index): HlsVariant[] => {
    const tag = lines[index - 1] ?? '';
    if (!isUri(line) || !tag.startsWith(STREAM_INF)) return [];
    return [{ url: resolveHlsUrl(baseUrl, line), bandwidth: bandwidthOf(tag) }];
  });
  return { kind: 'master', variants };
}

function media(lines: string[], baseUrl: string): HlsMedia {
  let sequence = Number(tagged(lines, MEDIA_SEQUENCE) ?? 0);
  const segments = lines
    .filter(isUri)
    .map((line) => ({ sequence: sequence++, url: resolveHlsUrl(baseUrl, line) }));
  const seconds = Number(tagged(lines, TARGET_DURATION));
  const mapUri = /URI="([^"]+)"/.exec(tagged(lines, MAP) ?? '')?.[1];
  return {
    kind: 'media',
    segments,
    targetDurationMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_TARGET_DURATION_MS,
    ended: lines.includes(END_LIST),
    initSegmentUrl: mapUri === undefined ? null : resolveHlsUrl(baseUrl, mapUri),
  };
}

function tagged(lines: string[], tag: string): string | undefined {
  return lines.find((line) => line.startsWith(tag))?.slice(tag.length);
}
