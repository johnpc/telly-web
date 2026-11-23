// Engine choice by URL. `.m3u8` → hls.js (or the native element when the
// browser plays HLS itself and has no MSE — iPhone Safari); `.ts`/MPEG-TS
// → mpegts.js; `.mp4/.mkv/.webm/.mov` → native; extensionless provider
// URLs get a byte sniff (a ranged GET of the first TS packets, since the
// Content-Type lies — raw TS arrives as `video/mp4`) and otherwise default
// to MPEG-TS, the IPTV norm. The libraries are imported lazily by their
// transports.
import { HlsTransport } from './hlsEngine';
import { MpegtsTransport } from './mpegtsEngine';
import { NativeTransport } from './nativeEngine';
import { SharedPlayerEngine } from './sharedPlayerEngine';
import type { Transport, TransportKind } from './transport';
import { sniffStream } from './urlProbe';
import { createVideoElement } from './videoElement';
import type { EngineDeps } from './engineDeps';
import { WebPlayerEngine } from './webPlayerEngine';

export type EngineKind = TransportKind;

export interface EngineCapabilities {
  /** Media Source Extensions (what mpegts.js and hls.js need). */
  mse: boolean;
  /** `<video>` plays HLS by itself (Safari). */
  nativeHls: boolean;
}

export function detectCapabilities(doc: Document = document): EngineCapabilities {
  const mse = typeof MediaSource !== 'undefined' || 'ManagedMediaSource' in globalThis;
  const nativeHls = doc.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
  return { mse, nativeHls };
}

const HLS_EXT = new Set(['m3u8', 'm3u']);
const TS_EXT = new Set(['ts', 'mts', 'm2ts', 'mpeg', 'mpg', 'mpegts']);
const FILE_EXT = new Set(['mp4', 'm4v', 'mkv', 'webm', 'mov']);

/** Lower-case extension of the URL path ('' when none); never the query string. */
export function extensionOf(url: string): string {
  const path = (url.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');
  const last = path.slice(path.lastIndexOf('/') + 1);
  const dot = last.lastIndexOf('.');
  return dot > 0 ? last.slice(dot + 1).toLowerCase() : '';
}

function hlsKind(caps: EngineCapabilities): EngineKind {
  return !caps.mse && caps.nativeHls ? 'native' : 'hls';
}

/** The kind the URL alone decides; null for an extensionless (sniff it). */
export function engineKindForUrl(url: string, caps: EngineCapabilities): EngineKind | null {
  const ext = extensionOf(url);
  if (HLS_EXT.has(ext)) return hlsKind(caps);
  if (TS_EXT.has(ext) || /mpegts/i.test(url)) return 'mpegts';
  if (FILE_EXT.has(ext)) return 'native';
  return ext === '' ? null : 'mpegts';
}

export function engineKindForContentType(contentType: string | null, caps: EngineCapabilities): EngineKind {
  const type = contentType ?? '';
  if (/mpegurl/i.test(type)) return hlsKind(caps);
  if (/^video\/(mp4|webm|quicktime|x-matroska)$/i.test(type)) return 'native';
  return 'mpegts';
}

export type Sniffer = (url: string) => Promise<string | null>;

export async function resolveEngineKind(
  url: string,
  caps: EngineCapabilities,
  sniff: Sniffer = sniffStream,
): Promise<EngineKind> {
  return engineKindForUrl(url, caps) ?? engineKindForContentType(await sniff(url), caps);
}

export function createTransport(kind: EngineKind): Transport {
  if (kind === 'hls') return new HlsTransport();
  if (kind === 'mpegts') return new MpegtsTransport();
  return new NativeTransport();
}

export function transportFactory(caps: EngineCapabilities, sniff?: Sniffer): EngineDeps['transportFor'] {
  return async (url) => createTransport(await resolveEngineKind(url, caps, sniff));
}

/** A ready-to-attach engine for the browser we are running in. */
export function createEngine(deps: Partial<EngineDeps> = {}): WebPlayerEngine {
  return new WebPlayerEngine({ transportFor: transportFactory(detectCapabilities()), ...deps });
}

/** The live-TV engine the guide preview and fullscreen player lease in turn. */
export function createSharedEngine(deps: Partial<EngineDeps> = {}): SharedPlayerEngine<WebPlayerEngine> {
  return new SharedPlayerEngine(() => {
    const engine = createEngine(deps);
    engine.attach(createVideoElement());
    return engine;
  });
}
