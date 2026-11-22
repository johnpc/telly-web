import type { ChannelRow, ProgramRow } from '@/core/db/types';
import type { GuideCell, GuideRow } from './guideModel';

/** A fixed local-time origin for deterministic guide tests. */
export const ORIGIN = new Date(2026, 10, 22, 12, 0, 0).getTime();
export const HOUR = 3_600_000;
export const MIN = 60_000;

export function channel(id: number, overrides: Partial<ChannelRow> = {}): ChannelRow {
  return {
    id,
    playlistId: 1,
    number: id,
    sortIndex: id,
    name: `Ch ${id}`,
    groupTitle: 'News',
    logoUrl: null,
    streamUrl: `http://x/${id}.ts`,
    tvgId: `c${id}`,
    favorite: false,
    hidden: false,
    favoriteOrder: 0,
    blocked: false,
    catchupType: null,
    catchupSource: null,
    catchupDays: null,
    customName: null,
    audioDecoder: null,
    videoDecoder: null,
    epgOffsetMinutes: 0,
    externalPlayer: null,
    epgOverride: null,
    ...overrides,
  };
}

export function program(
  tvgId: string,
  startMs: number,
  endMs: number,
  title = 'Show',
  id = startMs,
): ProgramRow {
  return {
    id,
    channelTvgId: tvgId,
    startMs,
    endMs,
    title,
    subTitle: null,
    description: 'About it',
    category: null,
    episode: null,
  };
}

export function cell(startMs: number, endMs: number, withProgram = true, tvgId = 'c1'): GuideCell {
  return { startMs, endMs, program: withProgram ? program(tvgId, startMs, endMs) : null };
}

/** A row of back-to-back hour cells from `from`, `count` of them. */
export function row(ch: ChannelRow, from: number, count: number, displayNumber = ch.id): GuideRow {
  const cells: GuideCell[] = [];
  for (let i = 0; i < count; i += 1)
    cells.push(cell(from + i * HOUR, from + (i + 1) * HOUR, true, ch.tvgId ?? 'x'));
  return { channel: ch, displayNumber, cells };
}
