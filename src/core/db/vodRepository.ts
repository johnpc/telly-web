import { type TellyDb, tellyDb } from './tellyDb';
import type { VodItemRow, VodPositionRow } from './types';

export type VodImport = Omit<VodItemRow, 'id' | 'playlistId' | 'sortIndex'>;

/** Swaps a playlist's VOD rows in playlist order (Android `VodImporter` + `VodItemDao`). */
export async function replaceVodItemsForPlaylist(
  db: TellyDb,
  playlistId: number,
  items: readonly VodImport[],
): Promise<number> {
  await db.vod_items.where('playlistId').equals(playlistId).delete();
  await db.vod_items.bulkAdd(items.map((item, sortIndex) => ({ ...item, playlistId, sortIndex })));
  return items.length;
}

/** Persistence for VOD items and resume positions (Android `VodItemDao` + `VodPositionDao`). */
export class VodRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  /** Every imported VOD item in playlist order (categories derive from it). */
  items(): Promise<VodItemRow[]> {
    return this.db.vod_items.orderBy('sortIndex').toArray();
  }

  async itemByKey(itemKey: string): Promise<VodItemRow | null> {
    return (await this.db.vod_items.where('itemKey').equals(itemKey).first()) ?? null;
  }

  itemCount(): Promise<number> {
    return this.db.vod_items.count();
  }

  replaceForPlaylist(playlistId: number, items: readonly VodImport[]): Promise<number> {
    return this.db.transaction('rw', this.db.vod_items, () =>
      replaceVodItemsForPlaylist(this.db, playlistId, items),
    );
  }

  /** All stored positions; the browser joins them onto its item cards. */
  positions(): Promise<VodPositionRow[]> {
    return this.db.vod_positions.toArray();
  }

  async positionByKey(itemKey: string): Promise<VodPositionRow | null> {
    return (await this.db.vod_positions.get(itemKey)) ?? null;
  }

  async savePosition(position: VodPositionRow): Promise<void> {
    await this.db.vod_positions.put(position);
  }

  removePosition(itemKey: string): Promise<void> {
    return this.db.vod_positions.delete(itemKey);
  }

  /** Settings -> Other -> VOD -> Clear playback positions. */
  clearPositions(): Promise<void> {
    return this.db.vod_positions.clear();
  }
}

export const vodRepository = new VodRepository();
