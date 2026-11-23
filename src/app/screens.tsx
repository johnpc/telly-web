import type { JSX } from 'react';
import type { Route, RouteKind } from '@/core/navigation/routes';
import { BootScreen } from './BootScreen';
import { ExitedScreen } from './ExitedScreen';
import { HistoryScreen } from '@/features/history/HistoryScreen';
import { ChannelNamesEditorScreen } from '@/features/channelmenu/ChannelNamesEditorScreen';
import { GuideScreen } from '@/features/guide/GuideScreen';
import { ManageFavoritesScreen, ReorderChannelsScreen } from '@/features/groups/ChannelEditHostScreen';
import { PlaybackScreen } from '@/features/playback/PlaybackScreen';
import { MyListScreen } from '@/features/mylist/MyListScreen';
import { MultiviewScreen } from '@/features/multiview/MultiviewScreen';
import { AddPlaylistWizardScreen } from '@/features/onboarding/AddPlaylistWizardScreen';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';
import { RecordingsScreen } from '@/features/recording/RecordingsScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { VodPlaybackScreen } from '@/features/vod/VodPlaybackScreen';
import { VodScreen } from '@/features/vod/VodScreen';

type ScreenFactory = (route: Route) => JSX.Element;

/** Route → screen registry, total over `RouteKind`: every Android route has its web screen. */
const SCREENS: Record<RouteKind, ScreenFactory> = {
  Boot: () => <BootScreen />,
  Exited: () => <ExitedScreen />,
  Playback: () => <PlaybackScreen />,
  History: () => <HistoryScreen />,
  Welcome: () => <WelcomeScreen />,
  AddPlaylistWizard: () => <AddPlaylistWizardScreen />,
  Search: () => <SearchScreen />,
  MyList: () => <MyListScreen />,
  Multiview: () => <MultiviewScreen />,
  Settings: () => <SettingsScreen />,
  Guide: () => <GuideScreen />,
  ManageFavorites: () => <ManageFavoritesScreen />,
  ReorderChannels: (route) => (
    <ReorderChannelsScreen group={route.kind === 'ReorderChannels' ? route.group : ''} />
  ),
  ChannelNamesEditor: () => <ChannelNamesEditorScreen />,
  Recordings: () => <RecordingsScreen />,
  Vod: () => <VodScreen />,
  VodPlayback: (route) => <VodPlaybackScreen itemKey={route.kind === 'VodPlayback' ? route.itemKey : ''} />,
};

export function screenFor(route: Route): JSX.Element {
  return SCREENS[route.kind](route);
}
