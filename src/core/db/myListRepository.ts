import { compareStrings } from './ordering';
import { type TellyDb, tellyDb } from './tellyDb';
import type { MyListRow } from './types';

function byAddedDesc(a: MyListRow, b: MyListRow): number {
  return b.addedAtMs - a.addedAtMs || compareStrings(a.channelKey, b.channelKey) || a.startMs - b.startMs;
}

/** My-list queries: most recently added first, per-airing dedupe (Android `MyListDao`). */
export class MyListRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  async all(): Promise<MyListRow[]> {
    return (await this.db.my_list.toArray()).sort(byAddedDesc);
  }

  /** Re-saving the same airing replaces its row instead of duplicating. */
  async upsert(entry: MyListRow): Promise<void> {
    await this.db.my_list.put(entry);
  }

  async find(channelKey: string, startMs: number): Promise<MyListRow | null> {
    return (await this.db.my_list.get([channelKey, startMs])) ?? null;
  }

  /** The remove half of the toggle and the screen's delete affordance. */
  remove(channelKey: string, startMs: number): Promise<void> {
    return this.db.my_list.delete([channelKey, startMs]);
  }
}

export const myListRepository = new MyListRepository();
