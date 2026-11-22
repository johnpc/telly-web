// The overlay stack as React state, plus the dropdown's live labels.
import { useSyncExternalStore } from 'react';
import { useMyListKeys } from '@/features/mylist/myListToggle';
import { useReminderKeys } from '@/features/reminders/guideReminders';
import { type SearchOverlay, type SearchOverlays, type SearchProgramAction } from './searchOverlay';
import { menuLabel } from './searchProgramMenu';
import type { SearchProgramHit } from './searchResults';

export function useSearchOverlay(overlays: SearchOverlays): SearchOverlay {
  return useSyncExternalStore(overlays.subscribe, overlays.snapshot);
}

/** The dropdown row labels for `hit`, flipping live with the reminders / My-list stores. */
export function useMenuLabels(hit: SearchProgramHit): (action: SearchProgramAction) => string {
  const reminderKeys = useReminderKeys();
  const myListKeys = useMyListKeys();
  return (action) => menuLabel(action, hit, reminderKeys, myListKeys);
}
