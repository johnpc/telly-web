import type { JSX } from 'react';
import type { Route, RouteKind } from '@/core/navigation/routes';
import { BootScreen } from './BootScreen';
import { ComingSoonScreen } from './ComingSoonScreen';
import { HistoryScreen } from '@/features/history/HistoryScreen';
import { ChannelNamesEditorScreen } from '@/features/guide/ChannelNamesEditorScreen';
import { GuideScreen } from '@/features/guide/GuideScreen';
import { ManageFavoritesScreen, ReorderChannelsScreen } from '@/features/groups/ChannelEditHostScreen';
import { PlaybackScreen } from '@/features/playback/PlaybackScreen';
import { MyListScreen } from '@/features/mylist/MyListScreen';
import { AddPlaylistWizardScreen } from '@/features/onboarding/AddPlaylistWizardScreen';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

type ScreenFactory = (route: Route) => JSX.Element;

/**
 * Route → screen registry. Each feature slice adds its entry as it lands;
 * unported routes render the placeholder so navigation never dead-ends.
 */
const SCREENS: Partial<Record<RouteKind, ScreenFactory>> = {
  Boot: () => <BootScreen />,
  Playback: () => <PlaybackScreen />,
  History: () => <HistoryScreen />,
  Welcome: () => <WelcomeScreen />,
  AddPlaylistWizard: () => <AddPlaylistWizardScreen />,
  Search: () => <SearchScreen />,
  MyList: () => <MyListScreen />,
  Settings: () => <SettingsScreen />,
  Guide: () => <GuideScreen />,
  ManageFavorites: () => <ManageFavoritesScreen />,
  ReorderChannels: (route) => (
    <ReorderChannelsScreen group={route.kind === 'ReorderChannels' ? route.group : ''} />
  ),
  ChannelNamesEditor: () => <ChannelNamesEditorScreen />,
};

export function screenFor(route: Route): JSX.Element {
  const factory = SCREENS[route.kind];
  return factory === undefined ? <ComingSoonScreen route={route} /> : factory(route);
}
