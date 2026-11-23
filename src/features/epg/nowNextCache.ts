import type { NowNext } from '@/core/db/programRepository';

/**
 * True while a now/next snapshot taken earlier still describes `atMs`:
 * nothing it knows has ended or started in between (its `next` is the first
 * programme after the snapshot, so no unseen programme can start before it).
 */
export function nowNextValidAt(entry: NowNext, atMs: number): boolean {
  const { now, next } = entry;
  if (now !== null && (now.startMs > atMs || now.endMs <= atMs)) return false;
  return next === null || next.startMs > atMs;
}

/** What a read found for an id with no EPG data: resolved, not pending, valid forever. */
const NO_DATA: NowNext = { now: null, next: null };

/**
 * In-memory now/next per EPG id. Android reads Room synchronously on the UI
 * thread, so its panel paints titles on the first frame; Dexie answers a tick
 * later, so the FIRST paint reads the last live result here and the live
 * query corrects it afterwards. Ids a read found no data for are cached as
 * `NO_DATA`, so a known-EPG-less channel is "resolved", not "pending".
 */
export class NowNextCache {
  private readonly entries = new Map<string, NowNext>();

  /** The snapshot for `ids` at `atMs`, or undefined when any id is unknown or stale. */
  read(ids: readonly string[], atMs: number): Map<string, NowNext> | undefined {
    const out = new Map<string, NowNext>();
    for (const id of ids) {
      const entry = this.fresh(id, atMs);
      if (entry === undefined) return undefined;
      if (entry !== NO_DATA) out.set(id, entry);
    }
    return out;
  }

  /** Remember a live read for `ids`; ids absent from `resolved` have no data. */
  store(ids: readonly string[], resolved: ReadonlyMap<string, NowNext>): void {
    for (const id of ids) this.entries.set(id, resolved.get(id) ?? NO_DATA);
  }

  /** The entry for `id` while it still describes `atMs`. */
  private fresh(id: string, atMs: number): NowNext | undefined {
    const entry = this.entries.get(id);
    return entry !== undefined && nowNextValidAt(entry, atMs) ? entry : undefined;
  }
}

/** The app-wide cache (one EPG, one cache); tests build their own. */
export const sharedNowNextCache = new NowNextCache();
