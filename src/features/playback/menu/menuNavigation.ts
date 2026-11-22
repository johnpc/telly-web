import type { Navigator } from '@/core/navigation/navigator';
import type { MenuNavigation } from './playbackMenuHandler';

/** Every route the fullscreen player leaves for (sheet rows, quick-bar slots, info cards). */
export interface PlaybackNavigation extends MenuNavigation {
  /** BACK at bare playback + the TV-guide card: the guide becomes the stack root so BACK from it exits. */
  exitToGuide(): void;
  openHistory(): void;
  openMultiview(): void;
  openRecordings(): void;
}

export type OpenWindow = (url: string) => void;

const openNewTab: OpenWindow = (url) => {
  window.open(url, '_blank', 'noopener');
};

export function playbackNavigationOf(
  navigator: Navigator,
  open: OpenWindow = openNewTab,
): PlaybackNavigation {
  return {
    exitToGuide: () => navigator.replaceAll({ kind: 'Guide' }),
    openHistory: () => navigator.push({ kind: 'History' }),
    openMultiview: () => navigator.push({ kind: 'Multiview' }),
    openRecordings: () => navigator.push({ kind: 'Recordings' }),
    openSearch: () => navigator.push({ kind: 'Search' }),
    openSettings: () => navigator.push({ kind: 'Settings' }),
    openManageFavorites: () => navigator.push({ kind: 'ManageFavorites' }),
    openReorderChannels: (group) => navigator.push({ kind: 'ReorderChannels', group }),
    openExternal: open,
  };
}
