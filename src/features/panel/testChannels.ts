import type { ChannelRow, ProgramRow } from '@/core/db/types';

/** A visible channel row with every column filled (tests only). */
export function testChannel(
  id: number,
  name: string,
  group: string,
  extra: Partial<ChannelRow> = {},
): ChannelRow {
  return {
    id,
    playlistId: 1,
    number: id,
    sortIndex: id - 1,
    name,
    groupTitle: group,
    logoUrl: null,
    streamUrl: `http://x/${id}.ts`,
    tvgId: `tvg-${id}`,
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
    ...extra,
  };
}

export function testProgram(
  channelTvgId: string,
  startMs: number,
  endMs: number,
  title: string,
  extra: Partial<ProgramRow> = {},
): ProgramRow {
  return {
    id: startMs,
    channelTvgId,
    startMs,
    endMs,
    title,
    subTitle: null,
    description: null,
    category: null,
    episode: null,
    ...extra,
  };
}
