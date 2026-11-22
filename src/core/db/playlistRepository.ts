import type { ChannelImport } from './channelReplace';
import { replaceChannelsForPlaylist } from './channelReplace';
import { putOrAdd } from './ordering';
import { type TellyDb, tellyDb } from './tellyDb';
import type { PlaylistRow } from './types';
import { type VodImport, replaceVodItemsForPlaylist } from './vodRepository';

/** Everything one import writes for a playlist: the EPG hint plus live and VOD rows. */
export interface PlaylistImport {
  epgUrl: string | null;
  channels: readonly ChannelImport[];
  vodItems: readonly VodImport[];
}

export interface ImportCounts {
  playlistId: number;
  channels: number;
  vodItems: number;
}

/** A human-readable default playlist name: the URL's last path segment. */
export function defaultPlaylistName(sourceUrl: string): string {
  const path = sourceUrl.split('?')[0]?.replace(/\/+$/, '') ?? '';
  const last = path.slice(path.lastIndexOf('/') + 1);
  return last.trim() === '' ? sourceUrl : last;
}

/** The upserted row: a null `name` keeps the existing name or derives a default; EPG stamps survive. */
function playlistRowFor(
  existing: PlaylistRow | null,
  sourceUrl: string,
  epgUrl: string | null,
  name: string | null,
  nowMs: number,
): Omit<PlaylistRow, 'id'> {
  return {
    name: name ?? existing?.name ?? defaultPlaylistName(sourceUrl),
    url: sourceUrl,
    epgUrl,
    lastUpdatedMs: nowMs,
    epgLastUpdatedMs: existing?.epgLastUpdatedMs ?? 0,
    epgFailedAtMs: existing?.epgFailedAtMs ?? 0,
  };
}

/** Room's `ON DELETE CASCADE` from playlists to channels and vod_items. */
async function deleteCascade(db: TellyDb, playlistId: number): Promise<void> {
  await db.channels.where('playlistId').equals(playlistId).delete();
  await db.vod_items.where('playlistId').equals(playlistId).delete();
  await db.playlists.delete(playlistId);
}

/** Persistence for user playlists (Android `PlaylistDao` + `RoomPlaylistRepository`). */
export class PlaylistRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  all(): Promise<PlaylistRow[]> {
    return this.db.playlists.orderBy('id').toArray();
  }

  async byId(id: number): Promise<PlaylistRow | null> {
    return (await this.db.playlists.get(id)) ?? null;
  }

  async byUrl(url: string): Promise<PlaylistRow | null> {
    return (await this.db.playlists.where('url').equals(url).first()) ?? null;
  }

  /**
   * Adds or refreshes the playlist stored at `sourceUrl` in ONE transaction:
   * the row is upserted (a null `name` keeps the existing name or derives a
   * default), `lastUpdatedMs` is stamped from `clock`, and the channel and
   * VOD rows are swapped with flags/overrides carried over by identity.
   */
  add(
    sourceUrl: string,
    parsed: PlaylistImport,
    name: string | null,
    clock: () => number,
  ): Promise<ImportCounts> {
    const { db } = this;
    return db.transaction('rw', [db.playlists, db.channels, db.vod_items], async () => {
      const existing = await this.byUrl(sourceUrl);
      const row = playlistRowFor(existing, sourceUrl, parsed.epgUrl, name, clock());
      const playlistId = await putOrAdd(db.playlists, row, existing?.id);
      const channels = await replaceChannelsForPlaylist(db, playlistId, parsed.channels);
      const vodItems = await replaceVodItemsForPlaylist(db, playlistId, parsed.vodItems);
      return { playlistId, channels, vodItems };
    });
  }

  /** A successful EPG run: fresh stamp, failure cleared. */
  markEpgUpdated(id: number, updatedMs: number): Promise<number> {
    return this.db.playlists.update(id, { epgLastUpdatedMs: updatedMs, epgFailedAtMs: 0 });
  }

  /** An EPG run where every source failed (the freshness state backs off from it). */
  markEpgFailed(id: number, failedAtMs: number): Promise<number> {
    return this.db.playlists.update(id, { epgFailedAtMs: failedAtMs });
  }

  rename(url: string, name: string): Promise<number> {
    return this.db.playlists.where('url').equals(url).modify({ name });
  }

  /** Re-keys the playlist in place (URL edit); false when unknown or `newUrl` is taken. */
  changeUrl(oldUrl: string, newUrl: string): Promise<boolean> {
    return this.db.transaction('rw', this.db.playlists, async () => {
      const movable = (await this.byUrl(newUrl)) === null && (await this.byUrl(oldUrl)) !== null;
      if (movable) await this.db.playlists.where('url').equals(oldUrl).modify({ url: newUrl });
      return movable;
    });
  }

  /** The URL of the playlist owning the channel OR VOD item at `streamUrl`. */
  async playlistUrlForStream(streamUrl: string): Promise<string | null> {
    const channel = await this.db.channels.where('streamUrl').equals(streamUrl).first();
    const owner = channel ?? (await this.db.vod_items.where('streamUrl').equals(streamUrl).first());
    return owner === undefined ? null : ((await this.byId(owner.playlistId))?.url ?? null);
  }

  /** Deletes the playlist and, like Room's CASCADE, its channels and VOD items. */
  remove(sourceUrl: string): Promise<void> {
    const { db } = this;
    return db.transaction('rw', [db.playlists, db.channels, db.vod_items], async () => {
      const existing = await this.byUrl(sourceUrl);
      if (existing !== null) await deleteCascade(db, existing.id);
    });
  }
}

export const playlistRepository = new PlaylistRepository();
