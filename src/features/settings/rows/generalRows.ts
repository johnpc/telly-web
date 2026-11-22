import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import { type AutoBackupStatus, autoBackupSummary } from '../backup/autoBackupState';
import { RowIds } from '../rowIds';
import { action, notSet, type SettingsRow, toggle, value } from '../settingsRow';

export const NOT_ON_WEB = '(not available on the web)';
export const UA_WEB_NOTE = 'Kept for backups; browsers cannot send a custom User-Agent';

/**
 * General pane rows (catalogue 54–56; port of Android `SettingsRowsGeneral.kt`).
 * Web honesties: the two autostart rows have no browser meaning and render
 * locked with the Android copy; the User-Agent persists for backup parity
 * only; the CORS proxy is the one web-only row (CLAUDE.md decisions log).
 */
export function generalRows(s: SettingsRepository, autoBackup: AutoBackupStatus): SettingsRow[] {
  return [
    { ...toggle(RowIds.AUTOSTART_BOOT, 'Auto start app on boot', false, NOT_ON_WEB), locked: true },
    {
      ...toggle(RowIds.AUTOSTART_WAKE, 'Auto start app on wake up from sleep mode', false, NOT_ON_WEB),
      locked: true,
    },
    toggle(
      RowIds.LAST_CHANNEL,
      'Turn on last channel on app start',
      s.get(TellySettings.LAST_CHANNEL_ON_START),
    ),
    toggle(
      RowIds.PIP_ON_HOME,
      'Switch to picture-in-picture mode on press Home',
      s.get(TellySettings.PIP_ON_HOME),
    ),
    toggle(RowIds.CONFIRM_EXIT, 'Confirm exit by second press Back', s.get(TellySettings.CONFIRM_EXIT)),
    value(RowIds.USER_AGENT, 'User-Agent', userAgentSummary(s.get(TellySettings.USER_AGENT))),
    value(RowIds.UDP_PROXY, 'UDP proxy (address:port)', notSet(s.get(TellySettings.UDP_PROXY))),
    value(RowIds.CORS_PROXY, 'CORS proxy', notSet(s.get(TellySettings.CORS_PROXY))),
    toggle(
      RowIds.AUTO_BACKUP,
      'Automatic backup',
      s.get(TellySettings.AUTO_BACKUP),
      autoBackupSummary(autoBackup),
    ),
    action(RowIds.BACK_UP_DATA, 'Back up data'),
    action(RowIds.RESTORE_DATA, 'Restore data'),
  ];
}

/** "Not set" when blank; otherwise the value with the browser caveat. */
export function userAgentSummary(raw: string): string {
  return raw.trim() === '' ? 'Not set' : `${raw} — ${UA_WEB_NOTE}`;
}
