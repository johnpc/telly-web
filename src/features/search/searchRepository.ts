// Runs one search over the database (port of Android `SearchRepository`):
// visible channels by name word-prefix or number prefix in name order, with
// their now/next for the cards; programmes by title word-prefix still airing
// or upcoming (soonest first, capped). Per-channel EPG offsets apply to the
// programme times exactly like the guide's lookups.
import { type ChannelRepository, channelRepository } from '@/core/db/channelRepository';
import { type ProgramRepository, programRepository } from '@/core/db/programRepository';
import { type ChannelRow, type ProgramRow, epgId } from '@/core/db/types';
import { type OffsetMap, offsetsOfMinutes, shifted } from '@/features/epg/epgOffsets';
import { resolveNowNext } from '@/features/epg/nowNext';
import type { ClockStyle } from './programTimes';
import { buildProgramChannels } from './searchPrograms';
import { byNameThenNumber, channelMatches, normalizeQuery } from './searchQuery';
import { EMPTY_RESULTS, type SearchChannelHit, type SearchResults, buildChannelHits } from './searchResults';

export interface SearchDeps {
  channels: ChannelRepository;
  programs: ProgramRepository;
}

/** Result cap for the programme list (the reference list is not capturable). */
export const PROGRAM_LIMIT = 100;

function stillAiring(programs: readonly ProgramRow[], atMs: number): ProgramRow[] {
  return programs.filter((program) => program.endMs > atMs);
}

function maxOffset(offsets: OffsetMap): number {
  return Math.max(0, ...offsets.values());
}

export class SearchRepository {
  constructor(
    private readonly deps: SearchDeps = { channels: channelRepository, programs: programRepository },
  ) {}

  async search(raw: string, atMs: number, style: ClockStyle): Promise<SearchResults> {
    const query = normalizeQuery(raw);
    if (query === '') return EMPTY_RESULTS;
    const visible = await this.deps.channels.visible();
    const offsets = offsetsOfMinutes(await this.deps.channels.epgOffsets());
    const matches = visible.filter((channel) => channelMatches(channel, query)).sort(byNameThenNumber);
    return {
      query,
      channels: await this.channelHits(matches, atMs, offsets),
      programs: buildProgramChannels(await this.programMatches(query, atMs, offsets), visible, atMs, style),
    };
  }

  /** The matching channels with their (offset-shifted) now programme. */
  private async channelHits(
    matches: readonly ChannelRow[],
    atMs: number,
    offsets: OffsetMap,
  ): Promise<SearchChannelHit[]> {
    const ids = matches.map(epgId).filter((id): id is string => id !== null);
    const rows = await this.deps.programs.airingOrUpcoming(ids, atMs - maxOffset(offsets));
    const guide = resolveNowNext(stillAiring(shifted(rows, offsets), atMs), atMs);
    return buildChannelHits(matches, guide, atMs);
  }

  /** Title matches still airing or upcoming once each channel's offset is applied. */
  private async programMatches(query: string, atMs: number, offsets: OffsetMap): Promise<ProgramRow[]> {
    const rows = await this.deps.programs.searchByTitle(query, atMs - maxOffset(offsets), PROGRAM_LIMIT);
    return stillAiring(shifted(rows, offsets), atMs);
  }
}

export const searchRepository = new SearchRepository();
