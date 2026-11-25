import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext, defaultSettingsRepository } from '@/core/settings/settingsContext';
import { AppDepsContext } from './appContext';
import { RootScreen } from './RootScreen';
import { takeLaunchLink } from './deepLink';
import { StartRoute } from './startRoute';
import { proxyDiscovery } from './proxyDiscovery';
import { installTestHooks } from './testHooks';
import { installGroupVisibility } from '@/features/playlist/groupVisibility';
import { TellySettings } from '@/core/settings/tellySettings';
import { LAST_CHANNEL_KEY, playbackDeps } from '@/features/playback/tune';

export function App(): JSX.Element {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const [deps] = useState(() => {
    installTestHooks(defaultSettingsRepository);
    installGroupVisibility(defaultSettingsRepository);
    // Fire-and-forget: a host that ships a stream proxy fills the setting in; the start route never waits.
    void proxyDiscovery.run();
    // `?channel=` is read once and stripped from the address bar; the matched channel becomes the last channel.
    return {
      startRoute: new StartRoute(
        () => defaultSettingsRepository.get(TellySettings.LAST_CHANNEL_ON_START),
        takeLaunchLink(),
        (channelId) => playbackDeps.store.set(LAST_CHANNEL_KEY, String(channelId)),
      ),
    };
  });
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsContext.Provider value={defaultSettingsRepository}>
        <AppDepsContext.Provider value={deps}>
          <NavigatorProvider start={{ kind: 'Boot' }}>
            <RootScreen />
          </NavigatorProvider>
        </AppDepsContext.Provider>
      </SettingsContext.Provider>
    </QueryClientProvider>
  );
}
