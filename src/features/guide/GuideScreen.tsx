import { useState, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { KeyQueue } from '@/core/input/keyQueue';
import { useHoldKeys } from '@/core/input/useKeyQueue';
import { usePlaybackSession } from '@/features/playback/tune';
import { GuideBodyScreen } from './GuideBodyScreen';
import { GUIDE_ROOT_STYLE } from './guideCss';

/**
 * The TV guide (capture 24): preview window + info pane on top, the
 * virtualized programme grid below. Mounts the body once the shared engine
 * lease and the channel list resolve (a bare frame meanwhile); keys pressed
 * before the body's first rows are held (`Startup key hold`) and replayed by it.
 */
export function GuideScreen(): JSX.Element {
  const session = usePlaybackSession();
  const [queue] = useState(() => new KeyQueue());
  useHoldKeys(queue);
  return (
    <FocusScope id="guide">
      <div className="relative h-full w-full overflow-hidden bg-telly-onboarding-bg" style={GUIDE_ROOT_STYLE}>
        {session === null ? (
          <div data-testid="guide-loading" />
        ) : (
          <GuideBodyScreen session={session} queue={queue} />
        )}
      </div>
    </FocusScope>
  );
}
