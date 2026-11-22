import { hashPin, newSalt, pinMatches, type RandomBytes } from './pinHasher';
import type { SettingsRepository } from './settingsRepository';
import { TellySettings } from './tellySettings';

/** The relock picker option that keeps an unlock until app restart. */
export const RELOCK_UNTIL_RESTART = 'Until app restart';

export interface ParentalControlsDeps {
  random?: RandomBytes;
  /** Ends any "until app restart" unlock; wired to the shared block session. */
  relock?: () => void;
}

/**
 * Parental-controls policy over the settings store (port of Android
 * `ParentalControls.kt`): a salted-hashed PIN gates locked channel groups
 * (and, optionally, Settings itself) whenever the master toggle is on.
 */
export class ParentalControls {
  private readonly random: RandomBytes | undefined;
  private readonly relock: () => void;

  constructor(
    private readonly settings: SettingsRepository,
    deps: ParentalControlsDeps = {},
  ) {
    this.random = deps.random;
    this.relock = deps.relock ?? ((): void => undefined);
  }

  get isEnabled(): boolean {
    return this.settings.get(TellySettings.PARENTAL_ENABLED);
  }

  get hasPin(): boolean {
    return this.settings.get(TellySettings.PARENTAL_PIN_HASH) !== '';
  }

  /** Turning parental controls off also drops any session unlock they granted. */
  setEnabled(enabled: boolean): void {
    this.settings.set(TellySettings.PARENTAL_ENABLED, enabled);
    if (!enabled) this.relock();
  }

  /** Stores a fresh salt + hash; the raw PIN is never persisted. A new PIN relocks. */
  async setPin(pin: string): Promise<void> {
    const salt = newSalt(this.random);
    this.settings.set(TellySettings.PARENTAL_PIN_SALT, salt);
    this.settings.set(TellySettings.PARENTAL_PIN_HASH, await hashPin(pin, salt));
    this.relock();
  }

  verifyPin(pin: string): Promise<boolean> {
    return pinMatches(
      pin,
      this.settings.get(TellySettings.PARENTAL_PIN_SALT),
      this.settings.get(TellySettings.PARENTAL_PIN_HASH),
    );
  }

  /** True when entering `groupTitle` to WATCH must be gated behind the PIN. */
  isGroupLocked(groupTitle: string): boolean {
    return (
      this.isEnabled &&
      !this.settings.get(TellySettings.PARENTAL_CHANNELS_ONLY) &&
      this.settings.get(TellySettings.PARENTAL_LOCKED_GROUPS).has(groupTitle)
    );
  }

  setGroupLocked(groupTitle: string, locked: boolean): void {
    const next = new Set(this.settings.get(TellySettings.PARENTAL_LOCKED_GROUPS));
    if (locked) next.add(groupTitle);
    else next.delete(groupTitle);
    this.settings.set(TellySettings.PARENTAL_LOCKED_GROUPS, next);
  }

  /** True when opening Settings must be gated behind the PIN. */
  isSettingsLocked(): boolean {
    return this.isEnabled && this.settings.get(TellySettings.PARENTAL_REQUIRE_FOR_SETTINGS);
  }

  /** True when opening Settings -> Playlists must be gated behind the PIN. */
  isPlaylistsLocked(): boolean {
    return this.isEnabled && this.settings.get(TellySettings.PARENTAL_REQUIRE_FOR_PLAYLISTS);
  }

  /** True when PIN prompts use the masked keyboard entry, not the wheels. */
  get usesKeyboardPin(): boolean {
    return this.settings.get(TellySettings.PARENTAL_PIN_INPUT_METHOD).toLowerCase() === 'keyboard';
  }

  /** True when every gated surface must re-prompt after an unlock (the default). */
  relocksAfterUnlock(): boolean {
    return this.settings.get(TellySettings.PARENTAL_RELOCK) !== RELOCK_UNTIL_RESTART;
  }
}
