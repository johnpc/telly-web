import type { ChannelRow } from '@/core/db/types';
import { type CatchupRequest, playableAsCatchup, requestOf } from '@/features/catchup';
import { type GuideCell, type GuideRow, hasInfo } from './guideModel';

/** What a regular OK on a cell does (director round: OK jumps to the player). */
export type GuideAction =
  | { kind: 'PlayChannel'; channel: ChannelRow }
  | { kind: 'PlayCatchup'; channel: ChannelRow; request: CatchupRequest };

/**
 * A PAST cell is playable as catch-up when the channel declares a usable
 * capability, the cell holds a real programme, it has fully aired and its
 * start lies within the `catchup-days` horizon (Android `CatchupPlayability`).
 */
export function catchupPlayable(channel: ChannelRow, cell: GuideCell, nowMs: number): boolean {
  return playableAsCatchup(channel, cell.startMs, cell.endMs, hasInfo(cell), nowMs);
}

/** Regular OK plays the row's channel fullscreen; a playable past cell plays its archive instead. */
export function activate(row: GuideRow, cell: GuideCell, nowMs: number): GuideAction {
  const { channel } = row;
  const request = catchupPlayable(channel, cell, nowMs)
    ? requestOf(channel, cell.startMs, cell.endMs, cell.program, nowMs)
    : null;
  return request === null ? { kind: 'PlayChannel', channel } : { kind: 'PlayCatchup', channel, request };
}
