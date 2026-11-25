// Byte-level container detection for extensionless provider URLs. Providers
// routinely label raw MPEG-TS as `video/mp4` (or send no type at all), so
// the first bytes decide: TS sync bytes on a 188-byte stride, an `#EXTM3U`
// playlist, or an ISO-BMFF box. Pure functions over a small buffer.

/** The containers the first bytes identify; null = undecided (trust the Content-Type). */
export type SniffedContainer = 'mpegts' | 'hls' | 'mp4';

export const TS_PACKET = 188;
export const TS_SYNC = 0x47;
/** Eight TS packets: three sync bytes in a row at ANY alignment fit inside. */
export const SNIFF_BYTES = TS_PACKET * 8;
/** Sync bytes that must line up before the buffer counts as MPEG-TS. */
export const SYNC_RUN = 3;

const MP4_BOXES = new Set(['ftyp', 'moov', 'moof']);

/** The media type each sniffed container maps to (what `engineKindForContentType` understands). */
export const CONTAINER_TYPES: Readonly<Record<SniffedContainer, string>> = {
  mpegts: 'video/mp2t',
  hls: 'application/vnd.apple.mpegurl',
  mp4: 'video/mp4',
};

export function sniffContainer(bytes: Uint8Array): SniffedContainer | null {
  if (isMpegts(bytes)) return 'mpegts';
  if (isHlsPlaylist(bytes)) return 'hls';
  if (isMp4(bytes)) return 'mp4';
  return null;
}

/** A live capture starts mid-packet, so the alignment offset is scanned over the first packet. */
export function isMpegts(bytes: Uint8Array): boolean {
  for (let offset = 0; offset < TS_PACKET; offset += 1) {
    if (syncRunAt(bytes, offset)) return true;
  }
  return false;
}

function syncRunAt(bytes: Uint8Array, offset: number): boolean {
  for (let i = 0; i < SYNC_RUN; i += 1) {
    if (bytes[offset + i * TS_PACKET] !== TS_SYNC) return false;
  }
  return true;
}

/** `#EXTM3U` as the first text (an optional BOM / leading whitespace tolerated). */
export function isHlsPlaylist(bytes: Uint8Array): boolean {
  const head = new TextDecoder()
    .decode(bytes.subarray(0, 16))
    .replace(/^\uFEFF/, '')
    .trimStart();
  return head.startsWith('#EXTM3U');
}

/** An ISO-BMFF file or fragment: the first box is `ftyp`, `moov` or `moof`. */
export function isMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return MP4_BOXES.has(String.fromCharCode(...bytes.subarray(4, 8)));
}
