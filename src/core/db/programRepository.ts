import { compareStrings } from './ordering';
import { type TellyDb, tellyDb } from './tellyDb';
import type { ProgramRow } from './types';

export type ProgramImport = Omit<ProgramRow, 'id'>;

/** The programme airing now and the one after it on a single channel. */
export interface NowNext {
  now: ProgramRow | null;
  next: ProgramRow | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Room's `ORDER BY channelTvgId, startMs`. */
export function byChannelThenStart(a: ProgramRow, b: ProgramRow): number {
  return compareStrings(a.channelTvgId, b.channelTvgId) || a.startMs - b.startMs;
}

/** REPLACE semantics of Room's unique (channelTvgId, startMs) index: the last row wins. */
export function dedupeByStart(programs: readonly ProgramImport[]): ProgramImport[] {
  const byKey = new Map<string, ProgramImport>();
  for (const program of programs) byKey.set(`${program.channelTvgId}\n${program.startMs}`, program);
  return [...byKey.values()];
}

/** SQLite `(' ' || title) LIKE '% q%'`: a case-insensitive word-prefix match. */
export function titleMatches(title: string, query: string): boolean {
  return ` ${title.toLowerCase()}`.includes(` ${query.toLowerCase()}`);
}

/** Persistence for guide programmes (Android `ProgramDao` + the search query). */
export class ProgramRepository {
  constructor(private readonly db: TellyDb = tellyDb) {}

  private forChannels(tvgIds: readonly string[]): Promise<ProgramRow[]> {
    return this.db.programs
      .where('channelTvgId')
      .anyOf([...tvgIds])
      .toArray();
  }

  /** Programmes overlapping [fromMs, toMs) for the given channels — the guide window. */
  async window(tvgIds: readonly string[], fromMs: number, toMs: number): Promise<ProgramRow[]> {
    const rows = await this.forChannels(tvgIds);
    return rows.filter((p) => p.endMs > fromMs && p.startMs < toMs).sort(byChannelThenStart);
  }

  /** Everything still airing or upcoming at `atMs`; feeds now/next. */
  async airingOrUpcoming(tvgIds: readonly string[], atMs: number): Promise<ProgramRow[]> {
    return (await this.forChannels(tvgIds)).filter((p) => p.endMs > atMs).sort(byChannelThenStart);
  }

  async nowAndNext(tvgId: string, nowMs: number): Promise<NowNext> {
    const rows = await this.airingOrUpcoming([tvgId], nowMs);
    return {
      now: rows.find((p) => p.startMs <= nowMs && p.endMs > nowMs) ?? null,
      next: rows.find((p) => p.startMs > nowMs) ?? null,
    };
  }

  /**
   * Atomic per-document schedule swap (Android `replaceFor`): without the
   * transaction, observers re-query between the delete and the insert and
   * the guide briefly renders every affected channel empty.
   */
  replaceFor(tvgIds: readonly string[], programs: readonly ProgramImport[]): Promise<number> {
    return this.db.transaction('rw', this.db.programs, async () => {
      await this.db.programs
        .where('channelTvgId')
        .anyOf([...tvgIds])
        .delete();
      const rows = dedupeByStart(programs);
      await this.db.programs.bulkAdd(rows);
      return rows.length;
    });
  }

  /** Trims history; mirrors "Past days to keep EPG". */
  deleteEndedBefore(beforeMs: number): Promise<number> {
    return this.db.programs.where('endMs').below(beforeMs).delete();
  }

  pruneOlderThan(days: number, nowMs: number): Promise<number> {
    return this.deleteEndedBefore(nowMs - Math.max(0, days) * DAY_MS);
  }

  count(): Promise<number> {
    return this.db.programs.count();
  }

  /** Every EPG channel id with data — the Assign EPG picker's options. */
  async channelIds(): Promise<string[]> {
    const keys = await this.db.programs.orderBy('channelTvgId').uniqueKeys();
    return keys.map(String);
  }

  /** Programmes by title word-prefix, still airing or upcoming, soonest first, capped. */
  async searchByTitle(query: string, atMs: number, limit: number): Promise<ProgramRow[]> {
    const rows = await this.db.programs.where('endMs').above(atMs).toArray();
    return rows
      .filter((p) => titleMatches(p.title, query))
      .sort((a, b) => a.startMs - b.startMs || byChannelThenStart(a, b))
      .slice(0, limit);
  }
}

export const programRepository = new ProgramRepository();
