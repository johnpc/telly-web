import { compareStrings } from './ordering';
import { type TellyDb, tellyDb } from './tellyDb';
import type { WatchHistoryRow } from './types';

function newestFirst(a: WatchHistoryRow, b: WatchHistoryRow): number {
  return b.watchedAtMs - a.watchedAtMs || compareStrings(a.channelKey, b.channelKey);
}

/** Watch-history queries: newest-first events, per-channel dedupe, capped size (Android `WatchHistoryDao`). */
export class WatchHistoryRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  /** Re-watching a channel replaces its row, keeping only the most recent. */
  async upsert(event: WatchHistoryRow): Promise<void> {
    await this.db.watch_history.put(event);
  }

  /** Watch events, most recently watched first. */
  async events(): Promise<WatchHistoryRow[]> {
    return (await this.db.watch_history.toArray()).sort(newestFirst);
  }

  /** Drops everything older than the `cap` most recent watches. */
  trimTo(cap: number): Promise<void> {
    return this.db.transaction('rw', this.db.watch_history, async () => {
      const stale = (await this.events()).slice(Math.max(0, cap)).map((row) => row.channelKey);
      await this.db.watch_history.bulkDelete(stale);
    });
  }

  clear(): Promise<void> {
    return this.db.watch_history.clear();
  }
}

export const watchHistoryRepository = new WatchHistoryRepository();
