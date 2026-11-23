import type { ChannelRow } from '@/core/db/types';
import { catchupAttributes } from './catchupAttributes';

const DAY_MS = 24 * 3_600_000;

/**
 * Whether a PAST programme is playable as catch-up (Android
 * `CatchupPlayability`): the channel declares a usable capability, the slot
 * holds a real programme (not an EPG "No information" filler), it has fully
 * aired, and its start still lies within the channel's `catchup-days`
 * horizon. Airing/future slots keep today's behaviour.
 */
export function playableAsCatchup(
  channel: ChannelRow,
  startMs: number,
  endMs: number,
  hasInfo: boolean,
  nowMs: number,
): boolean {
  if (!hasInfo || endMs > nowMs) return false;
  const attributes = catchupAttributes(channel);
  return attributes !== null && startMs >= nowMs - attributes.days * DAY_MS;
}
