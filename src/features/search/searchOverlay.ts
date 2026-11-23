// What covers the search screen: nothing, the programme dropdown, a branded
// placeholder, or the DVR custom-recording form (port of Android `SearchOverlay`).
import type { SearchProgramHit } from './searchResults';
import type { CustomRecordingForm } from '@/features/recording/customRecordingForm';

/** The dropdown rows for OK on a programme result — the guide-cell set (capture 27). */
export const SEARCH_PROGRAM_ACTIONS = [
  'Remind',
  'Record',
  'Custom recording',
  'Add to My list',
  'Program description',
] as const;

export type SearchProgramAction = (typeof SEARCH_PROGRAM_ACTIONS)[number];

// @stateMachine('Search overlay')
export type SearchOverlay =
  | { kind: 'None' }
  | { kind: 'ProgramMenu'; hit: SearchProgramHit }
  | { kind: 'ComingSoon'; feature: string }
  /** DVR: the dropdown's "Custom recording" form it carries; BACK drops both. */
  | { kind: 'CustomRecording'; form: CustomRecordingForm };

export const NO_OVERLAY: SearchOverlay = { kind: 'None' };

/** The search screen's overlay stack (one deep); the ONE write site for the mode. */
export class SearchOverlays {
  private overlay: SearchOverlay = NO_OVERLAY;
  private readonly listeners = new Set<() => void>();

  get current(): SearchOverlay {
    return this.overlay;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly snapshot = (): SearchOverlay => this.overlay;

  show(overlay: SearchOverlay): void {
    this.overlay = overlay;
    this.listeners.forEach((listener) => listener());
  }

  /** BACK with an overlay up closes just the overlay; false when none was up. */
  dismiss(): boolean {
    if (this.overlay.kind === 'None') return false;
    this.show(NO_OVERLAY);
    return true;
  }
}
