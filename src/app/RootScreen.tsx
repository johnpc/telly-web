import { useState, type JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useRoute } from '@/core/navigation/useRoute';
import { SoftRemote } from '@/core/ui/SoftRemote';
import { RemindersHost } from '@/features/reminders';
import { useApplyAppearance, useConfigAutoBackup } from '@/features/settings';
import { ExitedScreen } from './ExitedScreen';
import { screenFor } from './screens';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useStartRoute } from './useStartRoute';

/** Hosts the current route's screen; BACK at the root is the web "exit". */
export function RootScreen(): JSX.Element {
  const navigator = useNavigator();
  const route = useRoute();
  const [exited, setExited] = useState(false);
  useStartRoute();
  useBackgroundRefresh();
  useApplyAppearance();
  useConfigAutoBackup();
  const onBack = (): void => {
    // A BACK before the start route resolves must not count as "exit".
    if (route.kind === 'Boot') return;
    if (!navigator.pop()) setExited(true);
  };
  const restart = (): void => {
    setExited(false);
    navigator.replaceAll({ kind: 'Boot' });
  };
  return (
    <RemoteKeysProvider onBack={onBack}>
      <FocusScope id="app">
        <div className="h-full w-full" data-testid="app-root" data-route={route.kind}>
          {exited ? <ExitedScreen onRestart={restart} /> : screenFor(route)}
        </div>
      </FocusScope>
      <RemindersHost />
      <SoftRemote />
    </RemoteKeysProvider>
  );
}
