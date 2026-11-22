// The search shelves (port of Android `SearchResults` + `SearchResultsBuilder`
// channel half): what the typed state renders; an empty query = empty shelves.
import type { NowNext } from '@/core/db/programRepository';
import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import { type ClockStyle, airTimeText, progressPermille, remainingMinutes } from './programTimes';

/** One card of the Channels shelf: logo tile, name, airing title in accent, progress line. */
export interface SearchChannelHit {
  channel: ChannelRow;
  nowTitle: string | null;
  progressPermille: number;
}

/**
 * One airing row of the Programs rows pane: the programme, the channel it
 * airs on and its formatted air time. Currently-airing rows also carry the
 * dash progress + "50 min" remaining; both stay empty for upcoming rows.
 */
export interface SearchProgramHit {
  program: ProgramRow;
  channel: ChannelRow;
  title: string;
  timeText: string;
  progressPermille: number;
  remaining: string | null;
}

/** One master-lane card: a channel with ALL of its matching airings, chronological, never deduped. */
export interface SearchProgramChannel {
  channel: ChannelRow;
  airings: SearchProgramHit[];
}

export interface SearchResults {
  query: string;
  channels: SearchChannelHit[];
  programs: SearchProgramChannel[];
}

export const EMPTY_RESULTS: SearchResults = { query: '', channels: [], programs: [] };

export function isEmptyResults(results: SearchResults): boolean {
  return results.channels.length === 0 && results.programs.length === 0;
}

/** Channel cards keep the repository's name order and carry their airing programme. */
export function buildChannelHits(
  matches: readonly ChannelRow[],
  guide: ReadonlyMap<string, NowNext>,
  atMs: number,
): SearchChannelHit[] {
  return matches.map((channel) => {
    const id = epgId(channel);
    const now = id === null ? null : (guide.get(id)?.now ?? null);
    return {
      channel,
      nowTitle: now === null ? null : programTitle(now),
      progressPermille: now === null ? 0 : progressPermille(now.startMs, now.endMs, atMs),
    };
  });
}

/** Airing rows add dash progress + remaining minutes (live tm-03). */
export function programHit(
  program: ProgramRow,
  channel: ChannelRow,
  atMs: number,
  style: ClockStyle,
): SearchProgramHit {
  const airing = program.startMs <= atMs;
  return {
    program,
    channel,
    title: programTitle(program),
    timeText: airTimeText(program.startMs, program.endMs, atMs, style),
    progressPermille: airing ? progressPermille(program.startMs, program.endMs, atMs) : 0,
    remaining: airing ? `${remainingMinutes(program.endMs, atMs)} min` : null,
  };
}
