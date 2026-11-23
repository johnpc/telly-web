import { liveQuery } from 'dexie';
import { useEffect, useSyncExternalStore } from 'react';
import { playlistRepository } from '@/core/db/playlistRepository';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { useSettingsRepository } from '@/core/settings/settingsContext';
import { SharedResource } from '@/core/state/sharedResource';
import { TellySettings } from '@/core/settings/tellySettings';
import { writeAutoBackup } from './autoBackupFile';
import { AutoBackupState, type AutoBackupStatus } from './autoBackupState';
import { ConfigAutoBackup } from './configAutoBackup';
import { SettingsBackupManager } from './settingsBackup';

/** Module-level bookkeeping: one status store per page, shared by every mount. */
let sharedState: AutoBackupState | null = null;

export function autoBackupState(): AutoBackupState {
  sharedState ??= new AutoBackupState(window.localStorage);
  return sharedState;
}

/** The production engine over the settings store, the playlist table and the OPFS file. */
export function createAutoBackupEngine(settings: SettingsRepository): ConfigAutoBackup {
  const manager = new SettingsBackupManager(settings, playlistRepository);
  return new ConfigAutoBackup({
    enabled: () => settings.get(TellySettings.AUTO_BACKUP),
    buildJson: () => manager.exportJsonIfAny(),
    write: (json) => writeAutoBackup(json),
    state: autoBackupState(),
    clock: (): number => Date.now(),
    warn: (message, cause) => console.warn(message, cause),
  });
}

/** Starts the engine: settings writes and playlist-table changes trigger it. Returns the stop. */
export function startAutoBackup(
  settings: SettingsRepository,
  engine = createAutoBackupEngine(settings),
): () => void {
  const stopSettings = settings.subscribeChanges(() => engine.trigger());
  const subscription = liveQuery(() => playlistRepository.all()).subscribe({
    next: () => engine.trigger(),
    error: (error: unknown) => console.warn('config auto-backup triggers died', error),
  });
  return () => {
    stopSettings();
    subscription.unsubscribe();
    engine.cancel();
  };
}

/** One running backup watcher per settings store (the core `Shared resource lease`), shared by every mount. */
const watchers = new WeakMap<SettingsRepository, SharedResource<() => void>>();

function watcherFor(settings: SettingsRepository): SharedResource<() => void> {
  const existing = watchers.get(settings);
  if (existing !== undefined) return existing;
  const created = new SharedResource(
    () => startAutoBackup(settings),
    (stop) => stop(),
  );
  watchers.set(settings, created);
  return created;
}

/**
 * Mounts the automatic backup for the component's lifetime. Ref-counted so
 * the shell and the settings sheet may both call it: exactly ONE engine runs.
 */
export function useConfigAutoBackup(): void {
  const settings = useSettingsRepository();
  useEffect(() => watcherFor(settings).acquire().release, [settings]);
}

/** The live "last export" status for the General pane's row summary. */
export function useAutoBackupStatus(): AutoBackupStatus {
  const state = autoBackupState();
  return useSyncExternalStore(state.subscribe, () => state.status);
}
