/**
 * The add-playlist wizard's state (port of Android `WizardUiState.kt`).
 * Pages in forward order; every forward edge in `addPlaylistViewModel.ts`
 * checks the step it leaves, and SAVING makes Done single-shot / BACK inert.
 */
// @stateMachine('Onboarding wizard')
export type WizardStep =
  | 'TYPE_CHOOSER'
  | 'URL_ENTRY'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'EPG_URL'
  /** Done pressed on the EPG step; the playlist is being persisted (Done/BACK are inert). */
  | 'SAVING'
  | 'DONE';

/** Playlist source kinds offered by the type chooser; only M3U advances. */
export type PlaylistType = 'M3U' | 'XTREAM_CODES' | 'STALKER_PORTAL';

/** TV/VOD radio choice on the processed step (UI state only, like Android). */
export type PlaylistKind = 'TV' | 'VOD';

/** User-visible wizard failures; `WIZARD_ERROR_TEXT` carries the Android copy. */
export type WizardError = 'INVALID_URL' | 'LOAD_FAILED';

export const WIZARD_ERROR_TEXT: Readonly<Record<WizardError, string>> = {
  INVALID_URL: 'Enter a valid http(s) URL',
  LOAD_FAILED: 'Could not load the playlist. Check the URL and try again.',
};

/** Immutable snapshot of the add-playlist wizard. */
export interface WizardUiState {
  step: WizardStep;
  url: string;
  error: WizardError | null;
  name: string;
  kind: PlaylistKind;
  liveCount: number;
  movieCount: number;
  groupCount: number;
  /** EPG step draft (capture 13): pre-filled from the M3U's url-tvg. */
  epgUrl: string;
}

export const INITIAL_WIZARD_STATE: WizardUiState = {
  step: 'TYPE_CHOOSER',
  url: '',
  error: null,
  name: '',
  kind: 'TV',
  liveCount: 0,
  movieCount: 0,
  groupCount: 0,
  epgUrl: '',
};

export function channelCount(state: Pick<WizardUiState, 'liveCount' | 'movieCount'>): number {
  return state.liveCount + state.movieCount;
}
