import type { NowNext } from '@/core/db/programRepository';
import type { ProgramRow } from '@/core/db/types';

export type { NowNext };

/**
 * Pure fold from a window of programmes to per-channel now/next (port of
 * Android `NowNextResolver`). `programs` must be ordered by (channelTvgId,
 * startMs) and contain only rows ending after `atMs`; channels without
 * matching rows are absent from the result.
 */
export function resolveNowNext(programs: readonly ProgramRow[], atMs: number): Map<string, NowNext> {
  const out = new Map<string, NowNext>();
  for (const program of programs) {
    const entry = out.get(program.channelTvgId) ?? { now: null, next: null };
    out.set(program.channelTvgId, fold(entry, program, atMs));
  }
  return out;
}

/** The first airing row becomes `now`, the first future row `next`. */
function fold(entry: NowNext, program: ProgramRow, atMs: number): NowNext {
  const airing = program.startMs <= atMs && program.endMs > atMs;
  return {
    now: entry.now ?? (airing ? program : null),
    next: entry.next ?? (program.startMs > atMs ? program : null),
  };
}

/**
 * TiviMate's programme-title form (port of Android `ProgramTitle`):
 * `Title: Sub-title. S1 E10`, dropping the parts that are missing.
 */
export function programTitle(details: Pick<ProgramRow, 'title' | 'subTitle' | 'episode'>): string {
  const subTitle = details.subTitle?.trim() === '' ? null : details.subTitle;
  const episode = details.episode?.trim() === '' ? null : details.episode;
  const head = subTitle === null || subTitle === undefined ? details.title : `${details.title}: ${subTitle}`;
  return episode === null || episode === undefined ? head : `${head}. ${episode}`;
}
