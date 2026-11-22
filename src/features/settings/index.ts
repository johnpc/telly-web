/** Public surface of the settings slice (the shell + sibling slices import from here). */
export { SettingsScreen } from './SettingsScreen';
export { applyAppearance, observeAppearance, fontScaleFor } from './applyAppearance';
export { useApplyAppearance } from './useApplyAppearance';
export {
  readAutoBackup,
  writeAutoBackup,
  deleteAutoBackup,
  AUTO_BACKUP_FILE_NAME,
} from './backup/autoBackupFile';
export { useConfigAutoBackup, startAutoBackup } from './backup/autoBackupEngine';
export { SettingsBackupManager, restoreBackup } from './backup/settingsBackup';
export { accentHexFor, ACCENT_OPTIONS } from './accentPalette';
export * from './keymapOptions';
