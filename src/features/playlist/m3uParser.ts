import { type EntryHints, parseAttributes, toChannel } from './m3uAttributes';
import type { M3uChannel, M3uEntry, M3uPlaylist } from './m3uTypes';

/** Parser for M3U playlists: `#EXTINF` entries, stream URLs, `url-tvg` hint (Android `M3uParser`). */
export const M3U_HEADER = '#EXTM3U';
const EXTINF = '#EXTINF';
const EXTGRP = '#EXTGRP:';
const VLC_USER_AGENT = '#EXTVLCOPT:http-user-agent=';
const URL_TVG = 'url-tvg';

export function isHeader(line: string): boolean {
  return line.trim().startsWith(M3U_HEADER);
}

export function isExtInf(line: string): boolean {
  return line.trim().startsWith(EXTINF);
}

/** Parses one `#EXTINF:-1 key="value",Title` line; null when it is not one or has no title. */
export function parseExtInf(line: string): M3uEntry | null {
  if (!isExtInf(line)) return null;
  const trimmed = line.trim();
  const colon = trimmed.indexOf(':');
  const body = colon === -1 ? '' : trimmed.slice(colon + 1);
  const comma = body.lastIndexOf(',');
  const title = comma === -1 ? '' : body.slice(comma + 1).trim();
  if (title === '') return null;
  return { title, attributes: parseAttributes(body) };
}

/** Attributes on an `#EXTM3U` header line (e.g. `url-tvg`); empty otherwise. */
export function headerAttributes(line: string): Record<string, string> {
  return isHeader(line) ? parseAttributes(line) : {};
}

/** Line-by-line parse state: the EPG hint plus the EXTINF (and hints) awaiting its URL. */
class ParseAccumulator {
  private epgUrl: string | null = null;
  private pending: M3uEntry | null = null;
  private hints: EntryHints = { group: null, userAgent: null };
  private readonly channels: M3uChannel[] = [];

  accept(line: string): void {
    if (line === '') return;
    if (isHeader(line)) this.epgUrl = headerAttributes(line)[URL_TVG] ?? this.epgUrl;
    else if (isExtInf(line)) this.pending = parseExtInf(line);
    else if (!this.acceptHint(line) && !line.startsWith('#')) this.emit(line);
  }

  /** `#EXTGRP:` / `#EXTVLCOPT:http-user-agent=` between an entry and its URL; true when consumed. */
  private acceptHint(line: string): boolean {
    if (line.startsWith(EXTGRP))
      this.hints = { ...this.hints, group: line.slice(EXTGRP.length).trim() || null };
    else if (line.startsWith(VLC_USER_AGENT))
      this.hints = { ...this.hints, userAgent: line.slice(VLC_USER_AGENT.length) };
    else return false;
    return true;
  }

  private emit(streamUrl: string): void {
    if (this.pending !== null) this.channels.push(toChannel(this.pending, streamUrl, this.hints));
    this.pending = null;
    this.hints = { group: null, userAgent: null };
  }

  build(): M3uPlaylist {
    return { epgUrl: this.epgUrl, channels: this.channels };
  }
}

/** Parses a whole playlist body into channels plus the EPG URL hint. */
export function parseM3u(content: string): M3uPlaylist {
  const accumulator = new ParseAccumulator();
  for (const line of content.split(/\r?\n/)) accumulator.accept(line.trim());
  return accumulator.build();
}
