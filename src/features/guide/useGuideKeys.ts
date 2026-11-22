import { useCallback } from 'react';
import { type FocusEngine, focusEngine } from '@/core/focus/focusEngine';
import type { RemoteKey } from '@/core/input/remoteKeys';
import { useKeyHandler } from '@/core/input/useKeyHandler';
import { TellySettings } from '@/core/settings/tellySettings';
import type { GuideController } from './guideController';
import { GEAR_ID, routeGuideKey } from './guideKeyRouting';
import type { KeyQueue } from './keyQueue';

/**
 * One key handler for the whole guide screen: the grid layer routes every
 * D-pad key through the controller's policy (the grid renders no
 * focusables, like Android's key anchor); overlaid layers keep spatial
 * focus and only BACK/RIGHT route through it. Until the first rows have
 * loaded there is nothing to act on, so keys are parked in `queue` and
 * replayed in order once they have.
 */
export function useGuideKeys(
  controller: GuideController,
  queue: KeyQueue,
  focus: FocusEngine = focusEngine,
): void {
  const handler = useCallback(
    (key: RemoteKey): boolean => {
      if (!controller.loaded) {
        queue.push(key);
        return true;
      }
      return routeGuideKey(
        {
          layer: controller.layer.kind,
          focusedId: focus.current,
          onKey: (guideKey) => controller.onKey(guideKey),
          focusGear: () => void focus.focus(GEAR_ID),
          exit: () => !controller.deps.settings.get(TellySettings.CONFIRM_EXIT) || controller.exit.onBack(),
        },
        key,
      );
    },
    [controller, queue, focus],
  );
  useKeyHandler(handler);
}
