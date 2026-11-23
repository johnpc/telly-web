import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useRoute } from '@/core/navigation/useRoute';
import { SoftRemote } from '@/core/ui/SoftRemote';
import { RecordingsHost } from '@/features/recording';
import { RemindersHost } from '@/features/reminders';
import { useApplyAppearance, useConfigAutoBackup } from '@/features/settings';
import { screenFor } from './screens';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useStartRoute } from './useStartRoute';

/** Hosts the current route's screen; BACK at the root is the web "exit" (the `Exited` route). */
export function RootScreen(): JSX.Element {
  const navigator = useNavigator();
  const route = useRoute();
  useStartRoute();
  useBackgroundRefresh();
  useApplyAppearance();
  useConfigAutoBackup();
  const onBack = (): void => {
    // A BACK before the start route resolves must not count as "exit"; at the root it IS the exit.
    if (route.kind === 'Boot' || route.kind === 'Exited') return;
    if (!navigator.pop()) navigator.replaceAll({ kind: 'Exited' });
  };
  return (
    <RemoteKeysProvider onBack={onBack}>
      <FocusScope id="app">
        <div className="h-full w-full" data-testid="app-root" data-route={route.kind}>
          {screenFor(route)}
        </div>
      </FocusScope>
      <RemindersHost />
      <RecordingsHost />
      <SoftRemote />
    </RemoteKeysProvider>
  );
}
