import type { ChannelRow, ProgramRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import { catchupAttributes } from './catchupAttributes';
import { playableAsCatchup } from './catchupPlayability';
import type { CatchupRequest } from './catchupSession';
import { buildCatchupUrl } from './catchupUrl';

/**
 * Channel + programme window + "now" → the catch-up request the player
 * consumes, or null when the channel cannot build an archive URL. No
 * playability check: the guide already made it, and the rewind-live entry
 * targets the AIRING programme on purpose.
 */
export function requestOf(
  channel: ChannelRow,
  startMs: number,
  endMs: number,
  program: ProgramRow | null,
  nowMs: number,
): CatchupRequest | null {
  const attributes = catchupAttributes(channel);
  if (attributes === null) return null;
  const url = buildCatchupUrl(channel.streamUrl, attributes, startMs, endMs, nowMs);
  if (url === null) return null;
  return { channel, url, title: program === null ? null : programTitle(program), startMs, endMs };
}

/** A fully-aired programme's request; null outside the `catchup-days` horizon (transport hops). */
export function archiveRequest(
  channel: ChannelRow,
  program: ProgramRow,
  nowMs: number,
): CatchupRequest | null {
  if (!playableAsCatchup(channel, program.startMs, program.endMs, true, nowMs)) return null;
  return requestOf(channel, program.startMs, program.endMs, program, nowMs);
}
