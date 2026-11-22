import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { ChannelPanel } from '@/features/panel';
import { DISMISS } from '../overlay/playbackCommands';
import type { PlaybackController } from '../playbackController';
import type { PlaybackSession } from '../tune/usePlaybackSession';

/** Mounts the channel-panel slice for `PlaybackOverlay.Panel`; the ONE adapter between the two slices. */
export function PanelHost({
  session,
  ctl,
}: {
  session: PlaybackSession;
  ctl: PlaybackController;
}): JSX.Element {
  return (
    <FocusScope id="playback-panel" trap>
      <div className="absolute inset-0" data-testid="panel-host">
        <ChannelPanel
          session={session}
          onClose={() => ctl.commands.execute(DISMISS)}
          onTuned={() => ctl.onPanelTuned()}
          onContextMenu={(channel) => ctl.openChannelMenu(channel)}
        />
      </div>
    </FocusScope>
  );
}
