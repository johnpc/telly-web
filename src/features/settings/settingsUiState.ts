// The right-sheet stack (device-verified 2026-09-13): settings is a single
// 360 dp sheet at the screen's right edge over the dimmed underlying surface.
// The root sheet lists the sections; OK pushes a section sheet that REPLACES
// the root in place, BACK pops one sheet at a time and leaves settings from
// the root. `panes` holds the pushed sheets; empty means the root list.
// Port of Android `SettingsUiState.kt`.
// @stateMachine('Settings sheet')
// @stateMachine('Parental PIN gates')
import type { PickerSpec } from './pickers/pickerSpec';
import type { SettingsSectionId } from './settingsSection';

/** One pushed sheet: a section, or a deeper sub-sheet. */
export type SettingsPane =
  | { kind: 'Section'; section: SettingsSectionId }
  | { kind: 'PlaylistDetail'; url: string }
  /** Manage groups: the group toggles of the playlist at `url`. */
  | { kind: 'PlaylistGroups'; url: string }
  | { kind: 'EpgSources' }
  | { kind: 'EpgSourceDetail'; sourceId: number }
  /** Other -> Reminders: lead-time picker + the scheduled reminders. */
  | { kind: 'Reminders' }
  /** Other -> VOD (remember-position toggle + clear positions). */
  | { kind: 'Vod' }
  /** Other -> Recording (recording slice): storage + delete-all. */
  | { kind: 'Recording' }
  /** Other -> Search: the save-history toggle + clear action. */
  | { kind: 'OtherSearch' }
  /** Parental controls -> Blocked channels (entry PIN-gated once). */
  | { kind: 'BlockedChannels' }
  | { kind: 'AppearanceTvGuide' }
  | { kind: 'AppearancePlayer' }
  | { kind: 'AppearanceGroups' }
  | { kind: 'AppearanceLogos' }
  | { kind: 'RemoteTvGuide' }
  | { kind: 'RemotePlayer' };

/** What a verified PIN unlocks (the "Require PIN for …" toggles + the blocked list). */
export type PinTarget =
  /** "Require PIN for Settings": verified = the sheet opens; BACK leaves settings. */
  | 'SETTINGS'
  /** "Require PIN for Playlists": verified = the Playlists section opens. */
  | 'PLAYLISTS'
  /** Parental controls -> Blocked channels pane entry (gated while a PIN exists). */
  | 'BLOCKED_CHANNELS';

/** Modal state over the sheet stack. */
export type SettingsOverlay =
  | { kind: 'Picker'; spec: PickerSpec; current: string }
  /** `playlistUrl` = the playlist a per-playlist edit belongs to, captured when the editor opened. */
  | { kind: 'TextEdit'; rowId: string; title: string; value: string; playlistUrl: string | null }
  | { kind: 'ConfirmDelete'; url: string; name: string }
  | { kind: 'ConfirmDeleteSource'; sourceId: number; name: string }
  | { kind: 'ConfirmDeleteReminder'; reminderId: number; title: string }
  | { kind: 'ConfirmClearVodPositions' }
  | { kind: 'ConfirmDeleteRecordings' }
  /**
   * "Change PIN" / first-time PIN setup. `armsParental` = the master toggle
   * was activated without a PIN: parental controls turn on only when this
   * PIN commits, so BACK here leaves them off (never "on, but no PIN").
   */
  | { kind: 'PinSetup'; armsParental: boolean }
  /** The ONE PIN-verify overlay; `target` names what a verified PIN opens. */
  | { kind: 'PinVerify'; target: PinTarget }
  | { kind: 'ConfirmClearHistory' };

export interface SettingsUiState {
  panes: readonly SettingsPane[];
  overlay: SettingsOverlay | null;
}

export const INITIAL_SETTINGS_STATE: SettingsUiState = { panes: [], overlay: null };

/** The sheet on top: the deepest push, or null for the root list. */
export function activePane(state: SettingsUiState): SettingsPane | null {
  return state.panes[state.panes.length - 1] ?? null;
}

/** True while an overlay or pushed sheet consumes BACK before leaving. */
export function consumesBack(state: SettingsUiState): boolean {
  return state.overlay !== null || state.panes.length > 0;
}

/** A stable identity for one pane (focus memory + React keys); null pane = the root list. */
export function paneKey(pane: SettingsPane | null): string {
  if (pane === null) return 'root';
  switch (pane.kind) {
    case 'Section':
      return `Section:${pane.section}`;
    case 'PlaylistDetail':
    case 'PlaylistGroups':
      return `${pane.kind}:${pane.url}`;
    case 'EpgSourceDetail':
      return `EpgSourceDetail:${pane.sourceId}`;
    default:
      return pane.kind;
  }
}
