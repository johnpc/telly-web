import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { AddPlaylistViewModel, type WizardDeps } from './addPlaylistViewModel';
import { createWizardDeps, kickEpgRefresh } from './onboardingWiring';
import type { WizardUiState } from './wizardState';

export interface WizardSession {
  vm: AddPlaylistViewModel;
  state: WizardUiState;
  /** BACK / Back / Cancel: one step back, or leave the wizard from step one. */
  exit: () => void;
}

/** Test seams: how the wizard's deps are built and what Done kicks off. */
export interface WizardSessionOptions {
  depsFor?: (settings: SettingsRepository) => WizardDeps;
  onSaved?: (settings: SettingsRepository) => void;
}

/**
 * Hosts one `AddPlaylistViewModel` for the wizard route (Android
 * `WizardScreen`'s remember + BackHandler + DONE effect): DONE kicks the EPG
 * refresh and makes fullscreen playback the new root.
 */
export function useAddPlaylistWizard(options: WizardSessionOptions = {}): WizardSession {
  const settings = useSettingsRepository();
  const navigator = useNavigator();
  const { depsFor = createWizardDeps, onSaved = kickEpgRefresh } = options;
  const [vm] = useState(() => new AddPlaylistViewModel(depsFor(settings)));
  const state = useSyncExternalStore(vm.subscribe, vm.getState, vm.getState);
  useEffect(() => {
    if (state.step !== 'DONE') return;
    onSaved(settings);
    navigator.replaceAll({ kind: 'Playback' });
  }, [state.step, onSaved, settings, navigator]);
  const exit = useCallback((): void => {
    if (!vm.back()) navigator.pop();
  }, [vm, navigator]);
  return { vm, state, exit };
}
