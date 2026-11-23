import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAppDeps } from '@/app/appContext';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import type { PlaybackSession } from '@/features/playback/tune';
import type { GuideController } from './guideController';
import type { GuideDims } from './guideGeometry';
import { createGuideController } from './guideWiring';

/**
 * Builds the guide's controller once per screen mount over the leased
 * playback session and re-renders the host on every state change. The
 * cold-start decision is claimed here (exactly one guide tunes or not).
 */
export function useGuideController(session: PlaybackSession, dims: GuideDims): GuideController {
  const navigator = useNavigator();
  const settings = useSettingsRepository();
  const { startRoute } = useAppDeps();
  const [controller] = useState(() =>
    createGuideController({
      tuner: session.tuner,
      settings,
      navigator,
      tunesPreview: startRoute.guideTunesPreview(),
      dims,
    }),
  );
  useSyncExternalStore(controller.subscribe, () => controller.version);
  useEffect(() => () => controller.dispose(), [controller]);
  useResumePreview(controller, session);
  return controller;
}

/**
 * Android `resumeStored` on every guide build that may tune: the engine skips a
 * URL it is already streaming (seamless hand-over from fullscreen), while a
 * rebuilt engine (released after a Search round trip) re-tunes instead of
 * sitting black. A cold untuned start (`tunesPreview` false) stays dark.
 */
function useResumePreview(controller: GuideController, session: PlaybackSession): void {
  const ready = session.channels.length > 0;
  useEffect(() => {
    const { tuner, tunesPreview } = controller.deps;
    if (ready && tunesPreview) tuner.resumeStored();
  }, [controller, ready]);
}
