import type { PlayerEngine } from '@/core/player';
import type { SettingsRepository } from '@/core/settings/settingsRepository';
import {
  PIN_TRANSPORT,
  type PlaybackCommands,
  SHOW_TRANSPORT,
} from '@/features/playback/overlay/playbackCommands';
import type { TuneController } from '@/features/playback/tune';
import { type CatchupEpg, createCatchupEpg } from './catchupEpg';
import { CatchupPlayback } from './catchupPlayback';
import { type CatchupSession, catchupSession } from './catchupSession';
import { seekKeysOf, skipFrom } from './catchupToggles';

/** What the fullscreen player hands the catch-up mode (Android `PlaybackEnv` + `CatchupDeps`). */
export interface CatchupWiring {
  engine: PlayerEngine;
  tuner: TuneController;
  commands: PlaybackCommands;
  exitToGuide: () => void;
  settings: SettingsRepository;
  clock?: () => number;
  /** Defaults: the app's one session slot and the Dexie EPG. */
  session?: CatchupSession;
  epg?: CatchupEpg;
}

/** The production catch-up mode over the shared session, the live Remote-control toggles and the EPG. */
export function createCatchupPlayback(wiring: CatchupWiring): CatchupPlayback {
  const { commands, settings } = wiring;
  return new CatchupPlayback({
    engine: wiring.engine,
    tuner: wiring.tuner,
    session: wiring.session ?? catchupSession,
    epg: wiring.epg ?? createCatchupEpg(),
    seekKeys: () => seekKeysOf(settings),
    skip: () => skipFrom(settings),
    showTransport: () => commands.execute(SHOW_TRANSPORT),
    pinTransport: () => commands.execute(PIN_TRANSPORT),
    exitToGuide: wiring.exitToGuide,
    clock: wiring.clock ?? ((): number => Date.now()),
  });
}
