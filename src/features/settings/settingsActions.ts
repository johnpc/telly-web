import type { Setting } from '@/core/settings/setting';
import { TellySettings } from '@/core/settings/tellySettings';
import { appearancePaneFor } from './rows/appearanceRows';
import { RowIds } from './rowIds';
import type { SettingsController } from './settingsController';
import { confirmDeleteEpgSourceOverlay, editEpgSourceUrlOverlay } from './settingsEpgSourceActions';
import { runPlaylistAction } from './settingsPlaylistActions';
import { runRefresh, updateEpgMessage } from './settingsRefreshActions';
import type { SettingsOverlay, SettingsPane } from './settingsUiState';

/** Rows that simply push a deeper sub-pane over the current sheet. */
const PUSHED_PANES: Readonly<Record<string, SettingsPane>> = {
  [RowIds.EPG_SOURCES]: { kind: 'EpgSources' },
  [RowIds.PLAYLIST_EPG_SOURCES]: { kind: 'EpgSources' },
  [RowIds.REMOTE_TV_GUIDE]: { kind: 'RemoteTvGuide' },
  [RowIds.REMOTE_PLAYER]: { kind: 'RemotePlayer' },
  [RowIds.OTHER_RECORDING]: { kind: 'Recording' },
  [RowIds.OTHER_SEARCH]: { kind: 'OtherSearch' },
  [RowIds.OTHER_REMINDERS]: { kind: 'Reminders' },
  [RowIds.OTHER_VOD]: { kind: 'Vod' },
};

/** Free-form value rows: the editor title + the setting it commits to. */
export const TEXT_EDITS: Readonly<Record<string, { title: string; setting: Setting<string> }>> = {
  [RowIds.USER_AGENT]: { title: 'User-Agent', setting: TellySettings.USER_AGENT },
  [RowIds.UDP_PROXY]: { title: 'UDP proxy (address:port)', setting: TellySettings.UDP_PROXY },
  [RowIds.CORS_PROXY]: { title: 'CORS proxy', setting: TellySettings.CORS_PROXY },
};

/** Rows that open a fixed overlay. */
const OVERLAYS: Readonly<Record<string, SettingsOverlay>> = {
  [RowIds.EPG_ADD_SOURCE]: {
    kind: 'TextEdit',
    rowId: RowIds.EPG_ADD_SOURCE,
    title: 'EPG URL',
    value: '',
    playlistUrl: null,
  },
  [RowIds.VOD_CLEAR_POSITIONS]: { kind: 'ConfirmClearVodPositions' },
  [RowIds.PARENTAL_CHANGE_PIN]: { kind: 'PinSetup', armsParental: false },
  [RowIds.SEARCH_CLEAR_HISTORY]: { kind: 'ConfirmClearHistory' },
  [RowIds.RECORDING_DELETE_ALL]: { kind: 'ConfirmDeleteRecordings' },
};

/**
 * Non-generic row activations: everything that is not a plain toggle or
 * picker (port of Android `SettingsViewModelActions.kt`).
 */
export function runAction(c: SettingsController, rowId: string): void {
  const pane = PUSHED_PANES[rowId] ?? appearancePaneFor(rowId);
  const overlay = OVERLAYS[rowId];
  const textEdit = TEXT_EDITS[rowId];
  if (pane !== null && pane !== undefined) c.push(pane);
  else if (overlay !== undefined) c.showOverlay(overlay);
  else if (textEdit !== undefined) {
    const value = c.deps.settings.get(textEdit.setting);
    c.showOverlay({ kind: 'TextEdit', rowId, title: textEdit.title, value, playlistUrl: null });
  } else runNamedAction(c, rowId);
}

function runNamedAction(c: SettingsController, rowId: string): void {
  switch (rowId) {
    case RowIds.EPG_UPDATE_NOW:
      return runRefresh(c, rowId, () => updateEpgMessage(c));
    case RowIds.EPG_SOURCE_URL:
      return editEpgSourceUrlOverlay(c);
    case RowIds.EPG_SOURCE_DELETE:
      return confirmDeleteEpgSourceOverlay(c);
    case RowIds.BACK_UP_DATA:
      void c.deps.backup.exportJson().then((json) => c.deps.callbacks.onExportBackup(json));
      return;
    case RowIds.RESTORE_DATA:
      return c.deps.callbacks.onImportBackup();
    case RowIds.PARENTAL_BLOCKED_CHANNELS:
      return openBlockedChannels(c);
    case RowIds.ABOUT_PRIVACY_POLICY:
      return c.deps.callbacks.onOpenPrivacyPolicy();
    default:
      return runPlaylistAction(c, rowId);
  }
}

/** "Blocked channels" row: confirm the PIN once (while one exists), then push the pane. */
function openBlockedChannels(c: SettingsController): void {
  if (c.deps.parental.hasPin) c.showOverlay({ kind: 'PinVerify', target: 'BLOCKED_CHANNELS' });
  else c.push({ kind: 'BlockedChannels' });
}
