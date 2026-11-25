import type { JSX } from 'react';
import { FocusScope } from '@/core/focus/FocusScope';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useRoute } from '@/core/navigation/useRoute';
import { SoftRemote } from '@/core/ui/SoftRemote';
import { RecordingsHost } from '@/features/recording';
import { RemindersHost } from '@/features/reminders';
import { ScreenStackScreen } from './ScreenStackScreen';
import { StartNoticeScreen } from './StartNoticeScreen';
import { useApplyAppearance, useConfigAutoBackup } from '@/features/settings';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useStartRoute } from './useStartRoute';
import { exitToPlatform } from '@/platform/exit';
import { PwaUpdateToastScreen } from '@/platform/PwaUpdateToastScreen';

/** Hosts the route stack's screens; BACK at the root exits: to the TV on webOS/Tizen, else the `Exited` route. */
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
    if (!navigator.pop() && !exitToPlatform()) navigator.replaceAll({ kind: 'Exited' });
  };
  return (
    <RemoteKeysProvider onBack={onBack}>
      <FocusScope id="app">
        <ScreenStackScreen />
      </FocusScope>
      <RemindersHost />
      <RecordingsHost />
      <PwaUpdateToastScreen />
      <StartNoticeScreen />
      <SoftRemote />
    </RemoteKeysProvider>
  );
}
