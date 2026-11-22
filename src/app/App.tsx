import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { NavigatorProvider } from '@/core/navigation/NavigatorProvider';
import { SettingsContext, defaultSettingsRepository } from '@/core/settings/settingsContext';
import { AppDepsContext } from './appContext';
import { RootScreen } from './RootScreen';
import { StartRoute } from './startRoute';
import { installTestHooks } from './testHooks';
import { installGroupVisibility } from '@/features/playlist/groupVisibility';
import { TellySettings } from '@/core/settings/tellySettings';

export function App(): JSX.Element {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const [deps] = useState(() => {
    installTestHooks(defaultSettingsRepository);
    installGroupVisibility(defaultSettingsRepository);
    return {
      startRoute: new StartRoute(() => defaultSettingsRepository.get(TellySettings.LAST_CHANNEL_ON_START)),
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
