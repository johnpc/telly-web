import { useMemo } from 'react';
import { useAppDeps } from '@/app/appContext';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { createRestoreRunner, landAfterRestore, probeRestoreOffer } from './onboardingWiring';
import type { RestoreHooks } from './restoreRunner';
import { type WelcomeRestoreState, useRestoreOffer } from './useRestoreOffer';

/** The production restore hooks: OPFS probe, backup import + re-fetch, cold-start landing. */
export function useWelcomeRestore(overrides: Partial<RestoreHooks> = {}): WelcomeRestoreState {
  const settings = useSettingsRepository();
  const navigator = useNavigator();
  const { startRoute } = useAppDeps();
  const { probe, restore, requestAccess, land } = overrides;
  const hooks = useMemo<RestoreHooks>(
    () => ({
      probe: probe ?? probeRestoreOffer,
      restore: restore ?? ((json) => createRestoreRunner(settings).restore(json)),
      requestAccess: requestAccess ?? ((): void => undefined),
      land: land ?? ((): void => landAfterRestore(navigator, startRoute)),
    }),
    [probe, restore, requestAccess, land, settings, navigator, startRoute],
  );
  return useRestoreOffer(hooks);
}
