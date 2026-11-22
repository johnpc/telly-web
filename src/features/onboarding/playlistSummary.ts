import type { M3uChannel } from '@/features/playlist/m3uTypes';
import { isVod } from '@/features/playlist/vodClassifier';

/**
 * Pure helpers behind the "Playlist is processed" wizard step (port of
 * Android `PlaylistSummary.kt`). TiviMate classifies video-file stream URLs
 * as VOD ("Movies") and everything else as live channels, and suggests the
 * source URL's host as the playlist name.
 */
export function movieCount(channels: readonly M3uChannel[]): number {
  return channels.filter((channel) => isVod(channel.streamUrl)).length;
}

export function liveCount(channels: readonly M3uChannel[]): number {
  return channels.length - movieCount(channels);
}

/** Distinct non-blank `group-title` values. */
export function groupCount(channels: readonly M3uChannel[]): number {
  const groups = new Set<string>();
  for (const channel of channels) {
    const group = channel.groupTitle?.trim() ?? '';
    if (group !== '') groups.add(group);
  }
  return groups.size;
}

/** OkHttp's `toHttpUrlOrNull()`: an absolute http(s) URL with a host. */
export function parseHttpUrl(text: string): URL | null {
  try {
    const url = new URL(text);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '' ? url : null;
  } catch {
    return null;
  }
}

export function isHttpUrl(text: string): boolean {
  return parseHttpUrl(text) !== null;
}

/** TiviMate pre-fills the playlist name with the URL's host ("127.0.0.1"). */
export function suggestName(sourceUrl: string): string {
  return parseHttpUrl(sourceUrl)?.hostname ?? sourceUrl;
}
