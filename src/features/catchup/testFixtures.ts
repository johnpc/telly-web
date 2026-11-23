import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { channel } from '@/features/guide/testFixtures';
import type { CatchupRequest } from './catchupSession';

export const HOUR = 3_600_000;
/** A fixed "now" every catch-up test reasons from. */
export const NOW = 1_700_000_000_000;

/** A playlist channel with `news-one`-style catch-up attributes unless overridden. */
export function channelRow(id: number, overrides: Partial<ChannelRow> = {}): ChannelRow {
  return channel(id, {
    catchupType: 'default',
    catchupSource: `http://x/${id}.ts?utc={utc}&d={duration}`,
    catchupDays: 2,
    ...overrides,
  });
}

export function programRow(tvgId: string, startMs: number, endMs: number, title = 'Show'): ProgramRow {
  return {
    id: startMs,
    channelTvgId: tvgId,
    startMs,
    endMs,
    title,
    subTitle: null,
    description: null,
    category: null,
    episode: null,
  };
}

export function request(channel: ChannelRow, startMs: number, endMs: number, title = 'Show'): CatchupRequest {
  return {
    channel,
    url: `http://x/${channel.id}.ts?utc=${startMs / 1000}&d=${(endMs - startMs) / 1000}`,
    title,
    startMs,
    endMs,
  };
}
