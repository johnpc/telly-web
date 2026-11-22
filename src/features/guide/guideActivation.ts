import type { ChannelRow } from '@/core/db/types';
import { catchupAttributes } from './catchup/catchupAttributes';
import { buildCatchupUrl } from './catchup/catchupUrl';
import { DAY_MS } from './guideGeometry';
import { type GuideCell, type GuideRow, hasInfo } from './guideModel';

/** What a regular OK on a cell does (director round: OK jumps to the player). */
export type GuideAction =
  { kind: 'PlayChannel'; channel: ChannelRow } | { kind: 'PlayCatchup'; channel: ChannelRow; url: string };

/**
 * A PAST cell is playable as catch-up when the channel declares a usable
 * capability, the cell holds a real programme, it has fully aired and its
 * start lies within the `catchup-days` horizon (Android `CatchupPlayability`).
 */
export function catchupPlayable(channel: ChannelRow, cell: GuideCell, nowMs: number): boolean {
  if (!hasInfo(cell) || cell.endMs > nowMs) return false;
  const attributes = catchupAttributes(channel);
  return attributes !== null && cell.startMs >= nowMs - attributes.days * DAY_MS;
}

/** Regular OK plays the row's channel fullscreen; a playable past cell plays its archive instead. */
export function activate(row: GuideRow, cell: GuideCell, nowMs: number): GuideAction {
  const { channel } = row;
  const attributes = catchupPlayable(channel, cell, nowMs) ? catchupAttributes(channel) : null;
  const url =
    attributes === null
      ? null
      : buildCatchupUrl(channel.streamUrl, attributes, cell.startMs, cell.endMs, nowMs);
  return url === null ? { kind: 'PlayChannel', channel } : { kind: 'PlayCatchup', channel, url };
}
