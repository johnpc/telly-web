import type { ChannelCatchup } from '@/core/db/types';

/** How a provider exposes already-aired programmes (community M3U values). */
export type CatchupType = 'default' | 'append' | 'shift' | 'flussonic' | 'xc';

/** A channel's usable catch-up capability, resolved from its raw columns. */
export interface CatchupAttributes {
  type: CatchupType;
  source: string | null;
  days: number;
}

/** Horizon when `catchup-days` is absent (matches the EPG past-days default). */
export const DEFAULT_CATCHUP_DAYS = 7;

const TYPES: readonly CatchupType[] = ['default', 'append', 'shift', 'flussonic', 'xc'];

export function catchupTypeOf(raw: string | null): CatchupType | null {
  const key = raw?.trim().toLowerCase();
  return TYPES.find((t) => t === key) ?? null;
}

/** Shift/flussonic/xc rewrite the live URL, so they need no template. */
export function rewritesLiveUrl(type: CatchupType): boolean {
  return type !== 'default' && type !== 'append';
}

/**
 * Null when the channel cannot play catch-up: no recognised type (a bare
 * `catchup-source` implies "default"), or a template type without its template.
 */
export function catchupAttributes(channel: ChannelCatchup): CatchupAttributes | null {
  const source = channel.catchupSource?.trim() === '' ? null : channel.catchupSource;
  const type = catchupTypeOf(channel.catchupType) ?? (source === null ? null : 'default');
  if (type === null || (source === null && !rewritesLiveUrl(type))) return null;
  return { type, source, days: channel.catchupDays ?? DEFAULT_CATCHUP_DAYS };
}
