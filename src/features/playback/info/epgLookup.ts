import type { NowNext } from '@/core/db/programRepository';
import { epgId, type ChannelRow, type ProgramRow } from '@/core/db/types';
import { NO_NOW_NEXT } from './playbackInfo';

/** The EPG ids of `channels` that have one (the keys every now/next query takes). */
export function epgIdsOf(channels: readonly ChannelRow[] | undefined): string[] {
  return (channels ?? []).flatMap((channel) => {
    const id = epgId(channel);
    return id === null ? [] : [id];
  });
}

/** `guide[id]` with the empty now/next for channels without data (or before the first read). */
export function nowNextOf(guide: ReadonlyMap<string, NowNext> | undefined, id: string | null): NowNext {
  return (id === null ? undefined : guide?.get(id)) ?? NO_NOW_NEXT;
}

export function nowOf(
  guide: ReadonlyMap<string, NowNext> | undefined,
  channel: ChannelRow | null,
): ProgramRow | null {
  return channel === null ? null : nowNextOf(guide, epgId(channel)).now;
}
