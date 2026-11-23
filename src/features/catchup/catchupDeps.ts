import type { PlayerEngine } from '@/core/player';
import type { TuneController } from '@/features/playback/tune';
import type { CatchupEpg } from './catchupEpg';
import type { CatchupSeekKeys } from './catchupKeyPolicy';
import type { CatchupSession } from './catchupSession';
import type { CatchupSkip } from './skipSteps';

/**
 * Catch-up wiring shared by the guide (request producer) and the playback
 * screen (consumer): one session slot per app, live reads of the
 * Remote-control seek toggles, the configured Playback skip steps, and the
 * player seams the mode drives (Android `CatchupDeps` + `PlaybackEnv`).
 */
export type CatchupEngine = Pick<
  PlayerEngine,
  'positionMs' | 'seekTo' | 'pause' | 'play' | 'paused' | 'state' | 'subscribe'
>;
export type CatchupTuner = Pick<TuneController, 'tune' | 'playing' | 'current' | 'subscribe'>;

export interface CatchupPlaybackDeps {
  engine: CatchupEngine;
  tuner: CatchupTuner;
  session: CatchupSession;
  epg: CatchupEpg;
  seekKeys: () => CatchupSeekKeys;
  skip: () => CatchupSkip;
  showTransport: () => void;
  pinTransport: () => void;
  exitToGuide: () => void;
  clock: () => number;
}
