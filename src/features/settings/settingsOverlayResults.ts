import { TEXT_EDITS } from './settingsActions';
import type { SettingsController } from './settingsController';
import { addEpgSource, setEpgSourceUrl } from './settingsEpgSourceActions';
import { submitPlaylistName, submitPlaylistUrl, submitPlaylistUserAgent } from './settingsPlaylistActions';
import { RowIds } from './rowIds';
import type { PinTarget } from './settingsUiState';

// Overlay results (picker choice, text commits, PIN) — port of Android
// `SettingsViewModelOverlays.kt`.

export function choosePickerOption(c: SettingsController, raw: string): void {
  const picker = c.state.overlay;
  if (picker?.kind !== 'Picker') return;
  c.deps.settings.writeRaw(picker.spec.key, raw);
  c.dismissOverlay();
}

/** Commits the open text editor to the row it was opened for; the editor closes either way. */
export async function submitText(c: SettingsController, value: string): Promise<void> {
  const edit = c.state.overlay;
  if (edit?.kind !== 'TextEdit') return;
  c.dismissOverlay();
  const generic = TEXT_EDITS[edit.rowId];
  if (generic !== undefined) return c.deps.settings.set(generic.setting, value.trim());
  if (edit.rowId === RowIds.EPG_ADD_SOURCE) return addEpgSource(c, value);
  if (edit.rowId === RowIds.EPG_SOURCE_URL) return setEpgSourceUrl(c, value);
  if (edit.playlistUrl !== null) return submitPlaylistEdit(c, edit.rowId, edit.playlistUrl, value);
}

function submitPlaylistEdit(
  c: SettingsController,
  rowId: string,
  url: string,
  value: string,
): Promise<void> | void {
  if (rowId === RowIds.PLAYLIST_NAME) return submitPlaylistName(c, url, value);
  if (rowId === RowIds.PLAYLIST_USER_AGENT) return submitPlaylistUserAgent(c, url, value);
  if (rowId === RowIds.PLAYLIST_URL) return submitPlaylistUrl(c, url, value);
}

/**
 * Commits a new parental PIN (salted + hashed; never stored raw); a setup
 * that was arming the master toggle turns parental controls on with it.
 */
export async function submitPin(c: SettingsController, pin: string): Promise<void> {
  const setup = c.state.overlay;
  if (setup?.kind !== 'PinSetup') return;
  if (pin !== '') {
    await c.deps.parental.setPin(pin);
    if (setup.armsParental) c.deps.parental.setEnabled(true);
  }
  c.dismissOverlay();
}

/**
 * The ONE PIN-verify commit: a verified PIN opens what its target names.
 * A wrong PIN keeps prompting; BACK dismisses (or leaves settings for the
 * settings-entry gate). Resolves to whether the PIN verified.
 */
export async function submitVerifyPin(c: SettingsController, pin: string): Promise<boolean> {
  const verify = c.state.overlay;
  if (verify?.kind !== 'PinVerify') return false;
  if (!(await c.deps.parental.verifyPin(pin))) return false;
  c.dismissOverlay();
  openTarget(c, verify.target);
  return true;
}

function openTarget(c: SettingsController, target: PinTarget): void {
  if (target === 'PLAYLISTS') c.selectSection('PLAYLISTS');
  else if (target === 'BLOCKED_CHANNELS') c.push({ kind: 'BlockedChannels' });
}
