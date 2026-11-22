import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigator } from '@/core/navigation/useNavigator';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { downloadBackup, pickBackupFile } from './backup/backupFiles';
import { restoreBackup } from './backup/settingsBackup';
import { rowsFor } from './rows/rowsFor';
import { SettingsController } from './settingsController';
import { defaultSettingsDeps, type SettingsCallbacks } from './settingsDeps';
import type { SettingsFeeds } from './settingsFeeds';
import { markBusy, type SettingsRow } from './settingsRow';
import { activePane, type SettingsUiState } from './settingsUiState';
import type { RefreshStatus } from './refreshStatus';

export const PRIVACY_POLICY_URL = 'https://github.com/johnpc/telly#privacy';

/** One controller per sheet entry, wired into the shell (Android `SettingsScreenHost`). */
export function useSettingsController(): SettingsController {
  const settings = useSettingsRepository();
  const navigator = useNavigator();
  const [controller] = useState(() => {
    const callbacks: SettingsCallbacks = {
      onAddPlaylist: () => navigator.push({ kind: 'AddPlaylistWizard' }),
      onExportBackup: (json) => downloadBackup(json),
      onImportBackup: () => void importPicked(),
      onOpenPrivacyPolicy: () => void window.open(PRIVACY_POLICY_URL, '_blank', 'noopener'),
    };
    const created = new SettingsController(defaultSettingsDeps(settings, callbacks));
    const importPicked = async (): Promise<void> => {
      const json = await pickBackupFile();
      if (json !== null) await restoreBackup(json, created.deps.backup, created.deps.updatePlaylist);
    };
    return created;
  });
  return controller;
}

export function useSettingsState(controller: SettingsController): SettingsUiState {
  return useSyncExternalStore(controller.ui.subscribe, () => controller.ui.value);
}

export function useRefreshStatus(controller: SettingsController): RefreshStatus {
  return useSyncExternalStore(controller.refresh.status.subscribe, () => controller.refresh.status.value);
}

/** Bumps on every settings write so rows re-read the store (Android `settings.changes`). */
function useSettingsTick(): number {
  const settings = useSettingsRepository();
  const [tick, setTick] = useState(0);
  useEffect(() => settings.subscribeChanges(() => setTick((n) => n + 1)), [settings]);
  return tick;
}

/** The active sheet's rows (root section list when nothing is pushed), busy row marked. */
export function useSettingsRows(controller: SettingsController, feeds: SettingsFeeds): SettingsRow[] {
  const settings = useSettingsRepository();
  const state = useSettingsState(controller);
  const refresh = useRefreshStatus(controller);
  const tick = useSettingsTick();
  useEffect(() => controller.setFeeds(feeds), [controller, feeds]);
  const pane = activePane(state);
  return useMemo(() => {
    void tick;
    const rows = rowsFor(pane, settings, feeds, controller.deps.versionName);
    return markBusy(rows, refresh.kind === 'busy' ? refresh.rowId : null);
  }, [pane, settings, feeds, controller, refresh, tick]);
}

/** Whether the keyboard PIN entry is active (re-read on every settings write). */
export function useKeyboardPin(controller: SettingsController): boolean {
  const tick = useSettingsTick();
  return useMemo(() => {
    void tick;
    return controller.deps.parental.usesKeyboardPin;
  }, [tick, controller]);
}
