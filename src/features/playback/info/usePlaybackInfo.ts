import { useMemo } from 'react';
import { epgId, type ChannelRow } from '@/core/db/types';
import type { StreamDetails } from '@/core/player';
import { useNowNext } from '@/features/epg/useNowNext';
import type { ClockStyle } from './clockStyle';
import { epgIdsOf, nowNextOf } from './epgLookup';
import { buildPlaybackInfo, type PlaybackInfoData } from './playbackInfo';

/**
 * The ready-to-render info-overlay model for the tuned channel: now/next
 * from the live EPG query keyed on the instant the overlay opened, the
 * engine's probed stream facts for the badges (Android `PlaybackInfoFeed`).
 */
export function usePlaybackInfo(
  channel: ChannelRow | null,
  instant: number,
  details: StreamDetails | null,
  style: ClockStyle,
): PlaybackInfoData | null {
  const ids = useMemo(() => epgIdsOf(channel === null ? [] : [channel]), [channel]);
  const guide = useNowNext(ids, instant);
  return useMemo(() => {
    if (channel === null) return null;
    return buildPlaybackInfo(channel, nowNextOf(guide, epgId(channel)), details, instant, style);
  }, [channel, guide, details, instant, style]);
}
