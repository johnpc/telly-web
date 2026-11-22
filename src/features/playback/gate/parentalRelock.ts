import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { BlockSession } from './blockSession';

/**
 * Ends an "until app restart" unlock the moment the settings that granted it
 * change: parental controls turned off, or a new PIN hash stored. Returns
 * the unsubscribe (Android wires the same relock through `ParentalControls`).
 */
export function watchRelock(settings: SettingsRepository, session: BlockSession): () => void {
  const onEnabled = settings.observe(TellySettings.PARENTAL_ENABLED, (enabled) => {
    if (!enabled) session.relock();
  });
  const onPin = settings.observe(TellySettings.PARENTAL_PIN_HASH, () => session.relock());
  return () => {
    onEnabled();
    onPin();
  };
}
