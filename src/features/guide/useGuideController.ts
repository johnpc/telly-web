import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAppDeps } from '@/app/appContext';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import type { PlaybackSession } from '@/features/playback/tune';
import type { GuideController } from './guideController';
import { createGuideController } from './guideWiring';

/**
 * Builds the guide's controller once per screen mount over the leased
 * playback session and re-renders the host on every state change. The
 * cold-start decision is claimed here (exactly one guide tunes or not).
 */
export function useGuideController(session: PlaybackSession): GuideController {
  const navigator = useNavigator();
  const settings = useSettingsRepository();
  const { startRoute } = useAppDeps();
  const [controller] = useState(() =>
    createGuideController({
      tuner: session.tuner,
      settings,
      navigator,
      tunesPreview: startRoute.guideTunesPreview(),
    }),
  );
  useSyncExternalStore(controller.subscribe, () => controller.version);
  useEffect(() => () => controller.dispose(), [controller]);
  useResumePreview(controller, session);
  return controller;
}

/** The guide is reached from playback with the last channel still playing; a cold untuned start stays dark. */
function useResumePreview(controller: GuideController, session: PlaybackSession): void {
  const ready = session.channels.length > 0;
  useEffect(() => {
    const { tuner, tunesPreview } = controller.deps;
    if (ready && tunesPreview && tuner.current === null) tuner.resumeStored();
  }, [controller, ready]);
}
