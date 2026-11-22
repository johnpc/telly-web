import { putOrAdd } from './ordering';
import { type TellyDb, tellyDb } from './tellyDb';
import type { EpgSourceRow } from './types';

/** Display name of a source: the URL's host, like the reference names its sources. */
export function epgSourceName(url: string): string {
  const afterScheme = url.includes('://') ? url.slice(url.indexOf('://') + 3) : url;
  const host = afterScheme.split('/')[0]?.split(':')[0] ?? '';
  return host.trim() === '' ? url : host;
}

function byAdded(a: EpgSourceRow, b: EpgSourceRow): number {
  return a.addedAtMs - b.addedAtMs || a.id - b.id;
}

/**
 * Persistence for custom EPG sources (Android `EpgSourceDao`). The
 * auto-detected source (`url-tvg`) is NOT stored here — it lives on the
 * playlist row and is refreshed with it.
 */
export class EpgSourceRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  async all(): Promise<EpgSourceRow[]> {
    return (await this.db.epg_sources.toArray()).sort(byAdded);
  }

  /** The custom sources of one playlist, in fetch (added) order. */
  async forPlaylist(playlistUrl: string): Promise<EpgSourceRow[]> {
    return (await this.db.epg_sources.where('playlistUrl').equals(playlistUrl).toArray()).sort(byAdded);
  }

  /** Re-adding the same URL for a playlist replaces the old row (unique index). */
  add(playlistUrl: string, url: string, addedAtMs: number): Promise<number> {
    return this.db.transaction('rw', this.db.epg_sources, async () => {
      const existing = await this.db.epg_sources
        .where('[playlistUrl+url]')
        .equals([playlistUrl, url])
        .first();
      return putOrAdd(this.db.epg_sources, { playlistUrl, url, addedAtMs }, existing?.id);
    });
  }

  setUrl(id: number, url: string): Promise<number> {
    return this.db.epg_sources.update(id, { url });
  }

  remove(id: number): Promise<void> {
    return this.db.epg_sources.delete(id);
  }

  /** Follows a playlist URL edit: re-keys its custom sources in place. */
  rekeyPlaylist(oldUrl: string, newUrl: string): Promise<number> {
    return this.db.epg_sources.where('playlistUrl').equals(oldUrl).modify({ playlistUrl: newUrl });
  }
}

export const epgSourceRepository = new EpgSourceRepository();
