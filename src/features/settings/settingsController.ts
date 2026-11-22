import type { Setting } from '@/core/settings/setting';
import { currentRaw } from './pickers/pickerSpec';
import { pickersByRowId } from './pickers/settingsPickers';
import { RefreshRunner } from './refreshStatus';
import { RowIds, suffixOf } from './rowIds';
import { runAction } from './settingsActions';
import type { SettingsDeps } from './settingsDeps';
import { EMPTY_FEEDS, type PlaylistItem, type SettingsFeeds } from './settingsFeeds';
import { confirmDeleteReminderOverlay, unblockChannel } from './settingsListActions';
import { isSectionId, type SettingsSectionId } from './settingsSection';
import { togglesByRowId } from './settingsToggles';
import {
  activePane,
  INITIAL_SETTINGS_STATE,
  type SettingsOverlay,
  type SettingsPane,
  type SettingsUiState,
} from './settingsUiState';
import { ValueStore } from './valueStore';

/**
 * State holder for the right-sheet settings stack (port of Android
 * `SettingsViewModel`): the pane stack + overlay, dispatched generically
 * (toggle table, picker table) with the leftovers in `settingsActions.ts`.
 * Rows are rebuilt by the UI from the store + feeds on every change.
 */
export class SettingsController {
  readonly ui: ValueStore<SettingsUiState>;
  /** Per-pane last-focused row (Android `focusMemory`), kept across overlay round trips. */
  readonly focusMemory = new Map<string, string>();
  feeds: SettingsFeeds = EMPTY_FEEDS;

  constructor(
    readonly deps: SettingsDeps,
    readonly refresh: RefreshRunner = new RefreshRunner(),
  ) {
    // "Require PIN for Settings": the sheet opens behind a PIN prompt (BACK leaves).
    const gated = deps.parental.isSettingsLocked() && deps.parental.hasPin;
    this.ui = new ValueStore<SettingsUiState>(
      gated ? { panes: [], overlay: { kind: 'PinVerify', target: 'SETTINGS' } } : INITIAL_SETTINGS_STATE,
    );
  }

  get state(): SettingsUiState {
    return this.ui.value;
  }

  setFeeds(feeds: SettingsFeeds): void {
    this.feeds = feeds;
  }

  /** OK on a row. Locked rows are unfocusable and never reach this. */
  activate(rowId: string): void {
    const section = suffixOf(rowId, RowIds.SECTION_PREFIX);
    const toggle = togglesByRowId.get(rowId);
    const picker = pickersByRowId.get(rowId);
    const playlistUrl = suffixOf(rowId, RowIds.PLAYLIST_PREFIX);
    const sourceId = suffixOf(rowId, RowIds.EPG_CUSTOM_SOURCE_PREFIX);
    if (section !== null && isSectionId(section)) this.openSection(section);
    else if (rowId === RowIds.PARENTAL_MASTER) this.toggleParentalMaster();
    else if (toggle !== undefined) this.flip(toggle);
    else if (picker !== undefined)
      this.showOverlay({ kind: 'Picker', spec: picker, current: currentRaw(picker, this.deps.settings) });
    else if (playlistUrl !== null) this.push({ kind: 'PlaylistDetail', url: playlistUrl });
    else if (sourceId !== null) this.push({ kind: 'EpgSourceDetail', sourceId: Number(sourceId) });
    else if (rowId.startsWith(RowIds.REMINDER_PREFIX)) confirmDeleteReminderOverlay(this, rowId);
    else if (rowId.startsWith(RowIds.BLOCKED_CHANNEL_PREFIX)) void unblockChannel(this, rowId);
    else runAction(this, rowId);
  }

  /** BACK inside settings: overlay first, then one sheet. False = leave. */
  back(): boolean {
    const { overlay, panes } = this.state;
    // The settings-entry PIN prompt guards the whole sheet: BACK leaves.
    if (overlay?.kind === 'PinVerify' && overlay.target === 'SETTINGS') return false;
    if (overlay !== null) {
      this.dismissOverlay();
      return true;
    }
    if (panes.length === 0) return false;
    this.ui.update((s) => ({ ...s, panes: s.panes.slice(0, -1) }));
    return true;
  }

  push(pane: SettingsPane): void {
    this.ui.update((s) => ({ ...s, panes: [...s.panes, pane] }));
  }

  /** OK on a section row pushes its sheet over the root list. */
  selectSection(section: SettingsSectionId): void {
    this.ui.update((s) => ({ ...s, panes: [{ kind: 'Section', section }] }));
  }

  showOverlay(overlay: SettingsOverlay): void {
    this.ui.update((s) => ({ ...s, overlay }));
  }

  dismissOverlay(): void {
    this.ui.update((s) => ({ ...s, overlay: null }));
  }

  flip(setting: Setting<boolean>): void {
    this.deps.settings.set(setting, !this.deps.settings.get(setting));
  }

  currentDetailUrl(): string | null {
    const pane = activePane(this.state);
    return pane?.kind === 'PlaylistDetail' ? pane.url : null;
  }

  currentDetailItem(): PlaylistItem | null {
    const url = this.currentDetailUrl();
    return this.feeds.playlists.find((item) => item.url === url) ?? null;
  }

  /** Section entry, gated: "Require PIN for Settings | Playlists" prompts. */
  private openSection(section: SettingsSectionId): void {
    if (section === 'PLAYLISTS' && this.deps.parental.isPlaylistsLocked()) {
      this.showOverlay({ kind: 'PinVerify', target: 'PLAYLISTS' });
    } else this.selectSection(section);
  }

  /** Enabling without a PIN forces PIN setup first; the toggle turns on only when that PIN commits. */
  private toggleParentalMaster(): void {
    const enabling = !this.deps.parental.isEnabled;
    if (enabling && !this.deps.parental.hasPin) this.showOverlay({ kind: 'PinSetup', armsParental: true });
    else this.deps.parental.setEnabled(enabling);
  }
}
