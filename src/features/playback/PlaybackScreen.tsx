import { useState, type JSX } from 'react';
import { displayName } from '@/core/db/types';
import { FocusScope } from '@/core/focus/FocusScope';
import { KeyQueue } from '@/core/input/keyQueue';
import { useHoldKeys } from '@/core/input/useKeyQueue';
import { VideoSurface } from '@/core/player';
import { sharedPipState } from '@/features/pip/pipState';
import { Chrome } from './overlays/ChromeScreen';
import { usePlaybackSession, type PlaybackSession } from './tune/usePlaybackSession';
import { usePlaybackController } from './usePlaybackController';
import { usePipMode } from './usePlaybackStores';

/** The tuned channel as DOM data attributes (what the acceptance harness reads). */
function channelAttrs(session: PlaybackSession): Record<string, string | number | undefined> {
  const channel = session.playing?.channel;
  if (channel === undefined) return {};
  return { 'data-channel-number': channel.number, 'data-channel-name': displayName(channel) };
}

function SessionScreen({ session, queue }: { session: PlaybackSession; queue: KeyQueue }): JSX.Element {
  const ctl = usePlaybackController(session, undefined, queue);
  const inPip = usePipMode(sharedPipState);
  return (
    <FocusScope id="playback">
      <div
        className="relative h-full w-full overflow-hidden bg-black"
        data-testid="playback-screen"
        {...channelAttrs(session)}
      >
        <VideoSurface engine={session.engine} className="absolute inset-0 bg-black" />
        {!inPip && <Chrome session={session} ctl={ctl} />}
      </div>
    </FocusScope>
  );
}

/**
 * Fullscreen playback host (Android `PlaybackScreen`): the shared live engine's
 * video surface at the bottom of the stack, the active overlay above it, keys
 * routed through the catalogue key map. Keys pressed before the first channel
 * is tuned are held (`Startup key hold`) and replayed in order. In the PIP
 * window every piece of chrome hides: clean video only.
 */
export function PlaybackScreen(): JSX.Element {
  const session = usePlaybackSession();
  const [queue] = useState(() => new KeyQueue());
  useHoldKeys(queue);
  if (session === null) return <div className="h-full w-full bg-black" data-testid="playback-screen" />;
  return <SessionScreen session={session} queue={queue} />;
}
