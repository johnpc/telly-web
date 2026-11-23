import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { TellySettings } from '@/core/settings/tellySettings';
import type { CatchupSeekKeys } from './catchupKeyPolicy';
import { type CatchupSkip, parseSkipSteps, skipOf } from './skipSteps';

/** Live reads of Settings → Remote control (Android `CatchupToggles.snapshot`). */
export function seekKeysOf(settings: SettingsRepository): CatchupSeekKeys {
  return {
    rwFf: settings.get(TellySettings.SEEK_RWFF_CATCHUP),
    leftRight: settings.get(TellySettings.SEEK_LEFT_RIGHT),
    downUp: settings.get(TellySettings.SEEK_DOWN_UP),
    rwLive: settings.get(TellySettings.RW_REWINDS_LIVE),
    leftLive: settings.get(TellySettings.LEFT_REWINDS_LIVE),
    downLive: settings.get(TellySettings.DOWN_REWINDS_LIVE),
  };
}

/** Settings → Playback → "Skip steps", read per key press (Android `CatchupDeps.skip`). */
export function skipFrom(settings: SettingsRepository): CatchupSkip {
  return skipOf(parseSkipSteps(settings.get(TellySettings.SKIP_STEPS)));
}
