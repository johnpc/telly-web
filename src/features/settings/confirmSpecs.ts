import type { SettingsController } from './settingsController';
import { confirmDeleteEpgSource } from './settingsEpgSourceActions';
import {
  confirmClearHistory,
  confirmClearVodPositions,
  confirmDeleteRecordings,
  confirmDeleteReminder,
} from './settingsListActions';
import { confirmDeletePlaylist } from './settingsPlaylistActions';
import type { SettingsOverlay } from './settingsUiState';

/** One GuidedStep confirm: question title, body line, the primary action's label. */
export interface ConfirmSpec {
  title: string;
  body: string;
  primary: string;
}

/** The confirm copy per overlay (verbatim from the live capture for Delete playlist, screen 22). */
export function confirmSpecFor(overlay: SettingsOverlay): ConfirmSpec | null {
  switch (overlay.kind) {
    case 'ConfirmDelete':
      return {
        title: 'Delete playlist?',
        body: `All channels from the playlist "${overlay.name}" will no longer be available`,
        primary: 'Delete',
      };
    case 'ConfirmDeleteSource':
      return {
        title: 'Delete EPG source?',
        body: `Guide data from "${overlay.name}" will no longer be updated`,
        primary: 'Delete',
      };
    case 'ConfirmDeleteReminder':
      return {
        title: 'Delete reminder?',
        body: `You will no longer be reminded about "${overlay.title}"`,
        primary: 'Delete',
      };
    case 'ConfirmClearVodPositions':
      return {
        title: 'Clear playback positions?',
        body: 'Resume points for all VOD items will be removed',
        primary: 'Clear',
      };
    case 'ConfirmDeleteRecordings':
      return {
        title: 'Delete all recordings?',
        body: 'Every capture file and library entry will be deleted',
        primary: 'Delete',
      };
    case 'ConfirmClearHistory':
      return {
        title: 'Clear search history?',
        body: 'All saved search queries will be removed',
        primary: 'Clear',
      };
    default:
      return null;
  }
}

/** Runs the primary action of the open confirm (no-op for other overlays). */
export function runConfirmPrimary(c: SettingsController): Promise<void> | void {
  switch (c.state.overlay?.kind) {
    case 'ConfirmDelete':
      return confirmDeletePlaylist(c);
    case 'ConfirmDeleteSource':
      return confirmDeleteEpgSource(c);
    case 'ConfirmDeleteReminder':
      return confirmDeleteReminder(c);
    case 'ConfirmClearVodPositions':
      return confirmClearVodPositions(c);
    case 'ConfirmDeleteRecordings':
      return confirmDeleteRecordings(c);
    case 'ConfirmClearHistory':
      return confirmClearHistory(c);
    default:
      return undefined;
  }
}
