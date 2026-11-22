import type { M3uPlaylist } from '@/features/playlist/m3uTypes';
import type { AddPlaylistViewModel } from './addPlaylistViewModel';
import { isHttpUrl } from './playlistSummary';
import type { WizardUiState } from './wizardState';

/**
 * The wizard's EPG step (port of Android `AddPlaylistViewModelEpg.kt`,
 * capture 13): the url-tvg from the M3U header is pre-filled into "Enter
 * URL"; the value committed on Done is what telly fetches — overriding
 * url-tvg when edited. A blank URL skips the EPG ("Optional; skippable",
 * ux-spec 2 step 5); custom sources can be added later in Settings -> EPG.
 */
export function setEpgUrl(vm: AddPlaylistViewModel, url: string): void {
  vm.patch({ epgUrl: url, error: null });
}

/** "Paste playlist URL" (capture 13): copies the playlist URL to edit. */
export function pastePlaylistUrl(vm: AddPlaylistViewModel): void {
  setEpgUrl(vm, vm.state.url.trim());
}

/** A blank EPG URL skips the EPG; a non-blank one must be http(s). */
function epgUrlOf(vm: AddPlaylistViewModel): string | null | undefined {
  const epgUrl = vm.state.epgUrl.trim();
  if (epgUrl === '') return null;
  return isHttpUrl(epgUrl) ? epgUrl : undefined;
}

/** Done: persist the playlist with the (possibly edited) EPG URL, then DONE. */
export async function finishEpg(vm: AddPlaylistViewModel): Promise<void> {
  if (vm.state.step !== 'EPG_URL' || vm.parsed === null) return;
  const epgUrl = epgUrlOf(vm);
  if (epgUrl === undefined) {
    vm.patch({ error: 'INVALID_URL' });
    return;
  }
  vm.patch({ step: 'SAVING' });
  vm.patch(await persistWizard(vm, { ...vm.parsed, epgUrl }));
}

/** The write's outcome as a state patch: DONE, or back on the step with the load-failed copy. */
async function persistWizard(
  vm: AddPlaylistViewModel,
  playlist: M3uPlaylist,
): Promise<Partial<WizardUiState>> {
  try {
    await vm.deps.persist(vm.state.url.trim(), playlist, vm.state.name.trim() || null);
    return { step: 'DONE' };
  } catch {
    return { step: 'EPG_URL', error: 'LOAD_FAILED' };
  }
}
