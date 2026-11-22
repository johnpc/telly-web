/**
 * Row types of the `telly` IndexedDB database. Table and column names are
 * IDENTICAL to the Android Room schema (v13) so the two apps stay comparable
 * row for row; Room's `@Embedded` groups (source/flags/catchup/overrides)
 * are flattened exactly as Room stores them. `null` mirrors SQL NULL.
 */
export * from './storeTypes';

export interface PlaylistRow {
  id: number;
  name: string;
  /** The identity a re-add replaces on. */
  url: string;
  /** Auto-detected EPG (`url-tvg`); custom sources live in `epg_sources`. */
  epgUrl: string | null;
  /** 0 = never (always due). */
  lastUpdatedMs: number;
  epgLastUpdatedMs: number;
  /** v13: the last EPG attempt that fetched nothing (EpgFreshness backoff). */
  epgFailedAtMs: number;
}

/** Per-channel user state that must survive playlist refreshes (Room `ChannelFlags`). */
export interface ChannelFlags {
  favorite: boolean;
  hidden: boolean;
  /** Manage-Favorites position; ties keep the base zap order. */
  favoriteOrder: number;
  /** PIN-gated to tune; blocked channels stay listed with a lock. */
  blocked: boolean;
}

/** Per-channel "Channel options" overrides; null = follow the playlist/global. */
export interface ChannelOverrides {
  customName: string | null;
  audioDecoder: string | null;
  videoDecoder: string | null;
  epgOffsetMinutes: number;
  externalPlayer: string | null;
  /** Per-channel EPG id override (Assign EPG); null = auto (tvg-id). */
  epgOverride: string | null;
}

/** Where a channel comes from and how it is labelled in the playlist (Room `ChannelSource`). */
export interface ChannelSource {
  name: string;
  groupTitle: string | null;
  logoUrl: string | null;
  streamUrl: string;
  tvgId: string | null;
}

/** Catch-up capability as declared on the `#EXTINF` line (Room `ChannelCatchup`). */
export interface ChannelCatchup {
  catchupType: string | null;
  catchupSource: string | null;
  catchupDays: number | null;
}

/** One channel row; `number` is sequential from playlist order, `sortIndex` the import order. */
export interface ChannelRow extends ChannelSource, ChannelFlags, ChannelCatchup, ChannelOverrides {
  id: number;
  playlistId: number;
  number: number;
  sortIndex: number;
}

/** Descriptive programme fields shared by the XMLTV parser and the row (Room `ProgramDetails`). */
export interface ProgramDetails {
  title: string;
  subTitle: string | null;
  description: string | null;
  category: string | null;
  /** Already in display form ("S1 E10"). */
  episode: string | null;
}

/** One guide programme, keyed to channels by tvg-id; unique on (channelTvgId, startMs). */
export interface ProgramRow extends ProgramDetails {
  id: number;
  channelTvgId: string;
  startMs: number;
  endMs: number;
}

/** What every channel-facing surface renders: the custom name when set. */
export function displayName(channel: Pick<ChannelRow, 'name' | 'customName'>): string {
  const custom = channel.customName?.trim();
  return custom !== undefined && custom !== '' ? custom : channel.name;
}

/** The EPG channel id guide lookups use: the override, else the tvg-id. */
export function epgId(channel: Pick<ChannelRow, 'tvgId' | 'epgOverride'>): string | null {
  return channel.epgOverride ?? channel.tvgId;
}
