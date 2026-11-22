import { useEffect } from 'react';
import type { GuideController } from './guideController';
import { startMinuteTicker } from './guideNowTicker';

/** Keeps the controller's "now" on the minute while the guide is mounted. */
export function useGuideNow(controller: GuideController, now: () => number = () => Date.now()): void {
  useEffect(() => startMinuteTicker((nowMs) => controller.setNow(nowMs), now, document), [controller, now]);
}
