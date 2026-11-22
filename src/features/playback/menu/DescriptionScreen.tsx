import type { JSX } from 'react';
import type { ChannelRow } from '@/core/db/types';
import { programTitle } from '@/features/epg/nowNext';
import { useChannelNow } from '../info/useChannelNow';
import { Message } from '../ui/MessageScreen';
import { NO_INFORMATION } from './playerMenu';

/** The sheet's "Program description": the channel's airing programme title + synopsis. */
export function Description({ channel, instant }: { channel: ChannelRow; instant: number }): JSX.Element {
  const now = useChannelNow(channel, instant);
  return (
    <Message
      headline={now === null ? NO_INFORMATION : programTitle(now)}
      subtitle={now?.description ?? NO_INFORMATION}
    />
  );
}
