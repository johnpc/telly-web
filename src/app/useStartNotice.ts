import { useEffect, useSyncExternalStore } from 'react';
import { useAppDeps } from './appContext';
import type { StartNotice } from './startRoute';

/** How long the "No channel named …" notice stays up. */
export const START_NOTICE_MS = 5_000;

/** The start route's notice (a launch link nobody matched), dismissed on its own after `START_NOTICE_MS`. */
export function useStartNotice(): StartNotice {
  const { startRoute } = useAppDeps();
  const notice = useSyncExternalStore(startRoute.subscribe, () => startRoute.notice);
  useEffect(() => {
    if (notice.kind === 'None') return;
    const timer = window.setTimeout(() => startRoute.dismissNotice(), START_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, startRoute]);
  return notice;
}
