import { INITIAL_WIZARD_STATE, type WizardUiState } from './wizardState';

/**
 * The wizard's observable state holder (the `MutableStateFlow` half of
 * Android `AddPlaylistViewModel`): one immutable snapshot, patched in place,
 * read by React through `useSyncExternalStore(subscribe, getState)`.
 */
export class WizardStore {
  private current: WizardUiState = INITIAL_WIZARD_STATE;
  private readonly listeners = new Set<() => void>();

  get state(): WizardUiState {
    return this.current;
  }

  readonly getState = (): WizardUiState => this.current;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Replaces the snapshot with `patch` applied and notifies every subscriber. */
  patch(patch: Partial<WizardUiState>): void {
    this.current = { ...this.current, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
