import type { PlaylistRow } from '@/core/db/types';

/** One playlist's EPG-relevant identity: its URL and auto-detected EPG URL. */
export type EpgPair = readonly [playlistUrl: string, epgUrl: string | null];

/**
 * The playlists emissions "Update EPG on playlists change" should react to
 * (port of Android `EpgTriggers`). Live queries re-emit the whole table on
 * ANY write — including the refresher's own `markEpgUpdated` / `markEpgFailed`
 * stamps — so reacting to raw emissions made every EPG refresh trigger the
 * next one. Only a change to the set of (playlist URL, EPG URL) pairs counts.
 */
export function epgRelevantPairs(playlists: readonly Pick<PlaylistRow, 'url' | 'epgUrl'>[]): EpgPair[] {
  return playlists.map((playlist) => [playlist.url, playlist.epgUrl]);
}

/** A stable string of the pairs, handy as an effect/memo dependency. */
export function epgSignature(playlists: readonly Pick<PlaylistRow, 'url' | 'epgUrl'>[]): string {
  return JSON.stringify(epgRelevantPairs(playlists));
}

/** `distinctUntilChanged` over the pairs: true when nothing EPG-relevant changed. */
export function sameEpgPairs(a: readonly EpgPair[], b: readonly EpgPair[]): boolean {
  return a.length === b.length && a.every((pair, i) => pair[0] === b[i]?.[0] && pair[1] === b[i]?.[1]);
}
