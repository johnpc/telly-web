import type { M3uChannel, M3uEntry } from './m3uTypes';

/**
 * `key="quoted value"` (the Android pattern) plus the unquoted `key=value`
 * form some providers emit; an unquoted value ends at whitespace, a quote
 * or the comma that starts the title. Later duplicates win, like Kotlin's
 * `associate`.
 */
const ATTRIBUTE = /([\w-]+)=(?:"([^"]*)"|([^\s",]+))/g;

export function parseAttributes(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of text.matchAll(ATTRIBUTE)) {
    const key = match[1];
    if (key !== undefined) out[key] = match[2] ?? match[3] ?? '';
  }
  return out;
}

/** Kotlin `trim().toIntOrNull()`. */
export function intOrNull(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  return /^[+-]?\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Line-level hints that sit between an `#EXTINF` and its URL. */
export interface EntryHints {
  /** `#EXTGRP:` group, used when the entry has no `group-title`. */
  group: string | null;
  /** `#EXTVLCOPT:http-user-agent=`. */
  userAgent: string | null;
}

/** Lifts a parsed `#EXTINF` entry into a channel once its URL line arrives. */
export function toChannel(entry: M3uEntry, streamUrl: string, hints: EntryHints): M3uChannel {
  const a = entry.attributes;
  return {
    title: entry.title,
    streamUrl,
    tvgId: a['tvg-id'] ?? null,
    tvgName: a['tvg-name'] ?? null,
    tvgLogo: a['tvg-logo'] ?? null,
    groupTitle: a['group-title'] ?? hints.group,
    // "catchup-type" is the older spelling of "catchup" some providers still emit.
    catchup: a['catchup'] ?? a['catchup-type'] ?? null,
    catchupSource: a['catchup-source'] ?? null,
    catchupDays: intOrNull(a['catchup-days']),
    tvgChno: intOrNull(a['tvg-chno']),
    userAgent: hints.userAgent,
  };
}
