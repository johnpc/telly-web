import { describe, expect, it } from 'vitest';
import {
  CONTAINER_TYPES,
  isHlsPlaylist,
  isMp4,
  isMpegts,
  SNIFF_BYTES,
  sniffContainer,
  TS_PACKET,
} from './containerSniff';

/** `packets` TS packets of filler, starting `skew` bytes into the first one (a mid-packet live capture). */
function tsBytes(packets: number, skew = 0): Uint8Array {
  const out = new Uint8Array(packets * TS_PACKET - skew).fill(0xab);
  for (let p = TS_PACKET - skew; p < out.length; p += TS_PACKET) out[p] = 0x47;
  if (skew === 0) out[0] = 0x47;
  return out;
}

function box(type: string): Uint8Array {
  return new Uint8Array([0, 0, 0, 24, ...type.split('').map((c) => c.charCodeAt(0)), 1, 2, 3, 4]);
}

describe('sniffContainer', () => {
  it('finds TS sync bytes at a 188-byte stride from any alignment offset', () => {
    expect(sniffContainer(tsBytes(8))).toBe('mpegts');
    expect(sniffContainer(tsBytes(8, 100))).toBe('mpegts');
    expect(sniffContainer(tsBytes(8, 187))).toBe('mpegts');
    expect(isMpegts(tsBytes(3))).toBe(true);
    expect(SNIFF_BYTES).toBe(1504);
  });

  it('needs three syncs in a row: two packets, a random 0x47 or an empty buffer are not TS', () => {
    expect(isMpegts(tsBytes(2))).toBe(false);
    const noise = new Uint8Array(SNIFF_BYTES).fill(0xab);
    noise[0] = 0x47;
    noise[TS_PACKET] = 0x47;
    noise[300] = 0x47;
    expect(isMpegts(noise)).toBe(false);
    expect(isMpegts(new Uint8Array(0))).toBe(false);
    expect(sniffContainer(new Uint8Array(0))).toBeNull();
  });

  it('recognises an HLS playlist, with or without a BOM / leading whitespace', () => {
    const text = (s: string): Uint8Array => new TextEncoder().encode(s);
    expect(sniffContainer(text('#EXTM3U\n#EXT-X-VERSION:3\n'))).toBe('hls');
    expect(isHlsPlaylist(text('\uFEFF  #EXTM3U\n'))).toBe(true);
    expect(isHlsPlaylist(text('#EXTINF:10,\nseg.ts\n'))).toBe(false);
  });

  it('recognises ISO-BMFF by its first box and nothing shorter than a box header', () => {
    expect(sniffContainer(box('ftyp'))).toBe('mp4');
    expect(sniffContainer(box('moov'))).toBe('mp4');
    expect(sniffContainer(box('moof'))).toBe('mp4');
    expect(isMp4(box('mdat'))).toBe(false);
    expect(isMp4(new Uint8Array([0, 0, 0, 24, 102, 116]))).toBe(false);
    expect(sniffContainer(new Uint8Array(SNIFF_BYTES).fill(0x11))).toBeNull();
  });

  it('maps every container to the media type the engine chooser understands', () => {
    expect(CONTAINER_TYPES).toEqual({
      mpegts: 'video/mp2t',
      hls: 'application/vnd.apple.mpegurl',
      mp4: 'video/mp4',
    });
  });
});
