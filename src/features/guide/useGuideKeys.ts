import { useCallback } from 'react';
import { type FocusEngine, focusEngine } from '@/core/focus/focusEngine';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { TellySettings } from '@/core/settings/tellySettings';
import type { GuideController } from './guideController';
import { GEAR_ID, routeGuideKey } from './guideKeyRouting';

/**
 * One key handler for the whole guide screen: the grid layer routes every
 * D-pad key through the controller's policy (the grid renders no
 * focusables, like Android's key anchor); overlaid layers keep spatial
 * focus and only BACK/RIGHT route through it. Keys before the first rows
 * never reach it: the body's `Startup key hold` sits above and replays them.
 */
export function useGuideKeys(controller: GuideController, focus: FocusEngine = focusEngine): void {
  const handler = useCallback(
    (key: RemoteKey): boolean =>
      routeGuideKey(
        {
          layer: controller.layer.kind,
          focusedId: focus.current,
          onKey: (guideKey) => controller.onKey(guideKey),
          focusGear: () => void focus.focus(GEAR_ID),
          exit: () => !controller.deps.settings.get(TellySettings.CONFIRM_EXIT) || controller.exit.onBack(),
        },
        key,
      ),
    [controller, focus],
  );
  useKeyHandler(handler);
}
