import { ParentalControls } from '@/core/settings/parentalControls';
import { defaultSettingsRepository } from '@/core/settings/settingsContext';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import { BlockGate } from './blockGate';
import { BlockSession } from './blockSession';
import { watchRelock } from './parentalRelock';

/** The gate bundle the tune hub and both playback hosts share. */
export interface PlaybackGate {
  session: BlockSession;
  parental: ParentalControls;
  gate: BlockGate;
}

export function createPlaybackGate(settings: SettingsRepository): PlaybackGate {
  const session = new BlockSession();
  const parental = new ParentalControls(settings, { relock: () => session.relock() });
  watchRelock(settings, session);
  return { session, parental, gate: new BlockGate(parental, session) };
}

/** The ONE production gate: `playbackDeps.policies.gate` and the PIN prompt both read it. */
export const playbackGate: PlaybackGate = createPlaybackGate(defaultSettingsRepository);
