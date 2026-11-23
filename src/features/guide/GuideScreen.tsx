import { useState, type JSX } from 'react';
import { useCanvasDp } from '@/core/design/useCanvasDp';
import { FocusScope } from '@/core/focus/FocusScope';
import { KeyQueue } from '@/core/input/keyQueue';
import { useHoldKeys } from '@/core/input/useKeyQueue';
import { usePlaybackSession } from '@/features/playback/tune';
import { GuideBodyScreen } from './GuideBodyScreen';
import { dimsFor } from './guideGeometry';

/**
 * The TV guide (capture 24): preview window + info pane on top, the
 * virtualized programme grid below. Mounts the body once the shared engine
 * lease and the channel list resolve (a bare frame meanwhile); keys pressed
 * before the body's first rows are held (`Startup key hold`) and replayed by it.
 * The grid's dims follow the dp canvas (a rotation or the soft remote re-fits the body).
 */
export function GuideScreen(): JSX.Element {
  const session = usePlaybackSession();
  const [queue] = useState(() => new KeyQueue());
  const dims = dimsFor(useCanvasDp());
  useHoldKeys(queue);
  return (
    <FocusScope id="guide">
      <div className="relative h-full w-full overflow-hidden bg-telly-onboarding-bg">
        {session === null ? (
          <div data-testid="guide-loading" />
        ) : (
          <GuideBodyScreen key={`::`} session={session} queue={queue} dims={dims} />
        )}
      </div>
    </FocusScope>
  );
}
