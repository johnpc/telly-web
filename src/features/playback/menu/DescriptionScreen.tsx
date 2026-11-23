import type { JSX } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { MessageScreen, NO_INFORMATION } from '@/features/channelmenu';
import { programTitle } from '@/features/epg/nowNext';
import { useChannelNow } from '../info/useChannelNow';

/** The sheet's "Program description": the channel's airing programme title + synopsis, on the shared description screen. */
export function Description({ channel, instant }: { channel: ChannelRow; instant: number }): JSX.Element {
  const now = useChannelNow(channel, instant);
  return (
    <MessageScreen
      headline={now === null ? NO_INFORMATION : programTitle(now)}
      subtitle={now?.description ?? NO_INFORMATION}
      testId="guide-description"
    />
  );
}
