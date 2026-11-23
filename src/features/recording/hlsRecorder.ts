import { type HlsMedia, bestVariant, parseHlsPlaylist } from './hlsPlaylist';
import type { CaptureContext, CaptureSink } from './streamRecorder';

/** Per-capture dedupe state: segments at or below `lastSequence` are already on disk. */
export interface HlsProgress {
  lastSequence: number;
  initWritten: boolean;
}

interface ResolvedMedia {
  url: string;
  playlist: HlsMedia;
}

/**
 * The HLS capture (Android `HlsStreamRecorder`): hop a master playlist onto
 * its highest-bandwidth variant, then poll the media playlist per target
 * duration and append every new segment in order — TS segments concatenate
 * into a valid TS stream; fMP4 (`#EXT-X-MAP`) captures get their init
 * segment first and concatenate into a fragmented MP4 (the file was named
 * `.mp4` by the container probe). Progress is deduped by sequence number so
 * reconnect attempts never append a segment twice; `#EXT-X-ENDLIST` ends the
 * attempt, live playlists run until the stop / planned end.
 */
export async function recordHls(
  url: string,
  sink: CaptureSink,
  ctx: CaptureContext,
  progress: HlsProgress,
): Promise<number> {
  let written = 0;
  let media = await mediaPlaylist(url, ctx);
  while (!ctx.shouldStop()) {
    written += await appendNew(media.playlist, sink, ctx, progress);
    if (media.playlist.ended) break;
    await ctx.delay(media.playlist.targetDurationMs);
    if (ctx.shouldStop()) break;
    media = await mediaPlaylist(media.url, ctx);
  }
  return written;
}

/** Names the capture honestly: fMP4 renditions become `.mp4`, everything else `.ts` (Android `HlsContainerProbe`). */
export async function captureExtensionOf(
  streamUrl: string,
  ctx: Pick<CaptureContext, 'fetch'>,
): Promise<string> {
  if (!streamUrl.split(/[?#]/)[0]?.toLowerCase().endsWith('.m3u8')) return 'ts';
  try {
    const media = await mediaPlaylist(streamUrl, { ...ctx, signal: undefined });
    return media.playlist.initSegmentUrl === null ? 'ts' : 'mp4';
  } catch {
    return 'ts';
  }
}

/** Fetches `url`; a master playlist hops once onto its best variant. */
async function mediaPlaylist(
  url: string,
  ctx: Pick<CaptureContext, 'fetch'> & { signal?: AbortSignal | undefined },
): Promise<ResolvedMedia> {
  const playlist = parseHlsPlaylist(await fetchText(url, ctx), url);
  if (playlist.kind === 'media') return { url, playlist };
  const variant = bestVariant(playlist);
  if (variant === null) throw new Error(`HLS master without variants: ${url}`);
  const resolved = parseHlsPlaylist(await fetchText(variant.url, ctx), variant.url);
  if (resolved.kind !== 'media') throw new Error(`HLS variant is not a media playlist: ${variant.url}`);
  return { url: variant.url, playlist: resolved };
}

async function fetchText(
  url: string,
  ctx: { fetch: CaptureContext['fetch']; signal?: AbortSignal | undefined },
): Promise<string> {
  const response = await ctx.fetch(url, ctx.signal === undefined ? {} : { signal: ctx.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

/** Appends the init segment (once) plus every not-yet-written segment. */
async function appendNew(
  playlist: HlsMedia,
  sink: CaptureSink,
  ctx: CaptureContext,
  progress: HlsProgress,
): Promise<number> {
  let written = await appendInit(playlist, sink, ctx, progress);
  for (const segment of playlist.segments.filter((s) => s.sequence > progress.lastSequence)) {
    if (ctx.shouldStop()) break;
    written += await appendBody(segment.url, sink, ctx);
    progress.lastSequence = segment.sequence;
  }
  return written;
}

/** The fMP4 init segment, written exactly once per capture file. */
async function appendInit(
  playlist: HlsMedia,
  sink: CaptureSink,
  ctx: CaptureContext,
  progress: HlsProgress,
): Promise<number> {
  if (playlist.initSegmentUrl === null || progress.initWritten) return 0;
  const written = await appendBody(playlist.initSegmentUrl, sink, ctx);
  progress.initWritten = true;
  return written;
}

async function appendBody(url: string, sink: CaptureSink, ctx: CaptureContext): Promise<number> {
  const response = await ctx.fetch(url, { signal: ctx.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await sink.write(bytes);
  return bytes.byteLength;
}
