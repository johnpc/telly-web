import { useEffect, type JSX } from 'react';
import { displayName } from '@/core/db/types';
import { SheetScreen } from '@/features/channelmenu/SheetScreen';
import { sheetSections } from '@/features/channelmenu/sheetMenu';
import { programTitle } from '@/features/epg/nowNext';
import { useCustomGroups } from '@/features/groups/useCustomGroups';
import { isSavedInMyList, useMyListKeys } from '@/features/mylist/myListToggle';
import { useChannelNow } from '../info/useChannelNow';
import { BACK_TO_PANEL } from '../overlay/playbackCommands';
import type { PlaybackController } from '../playbackController';
import type { PlaybackSession } from '../tune/usePlaybackSession';

interface SheetLayerProps {
  channelId: number;
  ctl: PlaybackController;
  session: PlaybackSession;
  instant: number;
}

/**
 * The shared context sheet over the channel panel (long-OK on a row): labels
 * read the live flags and the airing programme; while it is up it feeds the
 * group tools their custom groups.
 */
export function SheetLayer({ channelId, ctl, session, instant }: SheetLayerProps): JSX.Element | null {
  const channel = session.tuner.byId(channelId) ?? session.playing?.channel ?? null;
  const now = useChannelNow(channel, instant);
  const myList = useMyListKeys();
  const groups = useCustomGroups();
  useEffect(() => ctl.menu.setCustomGroups(groups), [ctl, groups]);
  if (channel === null) return null;
  return (
    <SheetScreen
      scopeId="playback-channel-menu"
      focusPrefix="menu-"
      sections={sheetSections(now === null ? null : programTitle(now), displayName(channel))}
      flags={{
        favorite: channel.favorite,
        inMyList: isSavedInMyList(myList, channel, now?.startMs ?? null),
        blocked: channel.blocked,
      }}
      autoFocus="first"
      restore={ctl.menu.sheetFocus.restore}
      scrim
      onItem={(item) => ctl.menu.onMenuItem(item)}
      onBack={() => ctl.commands.execute(BACK_TO_PANEL)}
    />
  );
}
