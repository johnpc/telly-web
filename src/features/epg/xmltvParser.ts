import { gunzipSync } from 'fflate';
import { readChannel, readProgram } from './xmltvElements';
import type { XmltvDocument } from './xmltvTypes';

/**
 * XMLTV parser over `DOMParser` (port of Android `XmltvParser`; fine for the
 * ≤ 10 MB guides providers hand out). Tolerant of missing fields: it skips
 * programmes it cannot key or time. Malformed XML throws, so the source
 * counts as failed for the refresher.
 */
export function parseXmltv(xml: string): XmltvDocument {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('XMLTV: malformed XML');
  const channels = [...doc.getElementsByTagName('channel')].map(readChannel);
  const programs = [...doc.getElementsByTagName('programme')].map(readProgram);
  return {
    channels: channels.filter((channel) => channel !== null),
    programs: programs.filter((program) => program !== null),
  };
}

const GZIP_MAGIC = [0x1f, 0x8b];

/**
 * Many providers hand out `guide.xml.gz`; the magic bytes are sniffed like
 * Android's `CompressedXmltv`. `.xz` is NOT supported on the web (fflate has
 * no LZMA decoder) — such a source fails and is logged by the refresher.
 */
export function decodeXmltvBytes(bytes: Uint8Array): string {
  const inflated = bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1] ? gunzipSync(bytes) : bytes;
  return new TextDecoder('utf-8').decode(inflated);
}

export function parseXmltvBytes(bytes: Uint8Array): XmltvDocument {
  return parseXmltv(decodeXmltvBytes(bytes));
}
