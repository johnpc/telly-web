/** A single channel entry parsed from an `#EXTINF` playlist line. */
export interface M3uEntry {
  title: string;
  attributes: Record<string, string>;
}

/** One live channel: an `#EXTINF` entry paired with its stream URL (Android `M3uChannel`). */
export interface M3uChannel {
  title: string;
  streamUrl: string;
  tvgId: string | null;
  tvgName: string | null;
  tvgLogo: string | null;
  groupTitle: string | null;
  catchup: string | null;
  catchupSource: string | null;
  catchupDays: number | null;
  /** `tvg-chno`, parsed for completeness; numbering follows playlist order like Android. */
  tvgChno: number | null;
  /** `#EXTVLCOPT:http-user-agent`; browsers cannot send it (see playlistFetcher). */
  userAgent: string | null;
}

/** A fully parsed M3U playlist: optional `url-tvg` EPG hint plus channels. */
export interface M3uPlaylist {
  epgUrl: string | null;
  channels: M3uChannel[];
}
