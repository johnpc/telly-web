import type { ChannelRow } from '@/core/db/types';
import type { SimpleRemoteKey } from '@/core/input/remoteKeys';
import type { PlayerEngine } from '@/core/player';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import { catchupAttributes } from './catchupAttributes';
import { type CatchupMode, type CatchupSeekKeys, catchupCommandFor } from './catchupKeyPolicy';
import type { CatchupPlayback } from './catchupPlayback';
import type { CatchupState } from './catchupSession';
import type { CatchupSkip } from './skipSteps';

/**
 * The transport ⏸ during catch-up (Android `CatchupPause`): pause pins the
 * info/transport overlay (the VOD stays-up-while-paused idiom) and resume
 * re-arms its auto-hide. Inert outside catch-up mode — live pause is
 * timeshift, a later slice.
 */
export class CatchupPause {
  constructor(
    private readonly engine: Pick<PlayerEngine, 'pause' | 'play' | 'paused'>,
    private readonly active: () => boolean,
    private readonly show: () => void,
    private readonly pin: () => void,
  ) {}

  get paused(): boolean {
    return this.engine.paused;
  }

  toggle(): void {
    if (!this.active()) return;
    if (this.engine.paused) {
      this.engine.play();
      this.show();
    } else {
      this.engine.pause();
      this.pin();
    }
  }
}

/** The playback mode's surface the key routing drives. */
export interface CatchupKeyHost {
  mode(): CatchupMode;
  seekKeys(): CatchupSeekKeys;
  skip(): CatchupSkip;
  seekBy(deltaMs: number): void;
  rewindLive(deltaMs: number): void;
  back(): void;
}

/**
 * Routes a key through `catchupCommandFor` and executes the resulting
 * command against the playback mode; true = the key was a catch-up action
 * (Android `CatchupKeyRouting`).
 */
export function routeCatchupKey(
  host: CatchupKeyHost,
  overlay: PlaybackOverlay,
  key: SimpleRemoteKey,
): boolean {
  const command = catchupCommandFor(overlay, key, host.mode(), host.seekKeys(), host.skip());
  if (command === null) return false;
  if (command.kind === 'Seek') host.seekBy(command.deltaMs);
  else if (command.kind === 'RewindLive') host.rewindLive(command.deltaMs);
  else host.back();
  return true;
}

/** How catch-up relates to what is playing: on, off but the tuned channel could rewind live, or off. */
export function modeOf(state: CatchupState | null, current: ChannelRow | null): CatchupMode {
  if (state !== null) return 'Playing';
  return current !== null && catchupAttributes(current) !== null ? 'LiveCapable' : 'None';
}

/** The playback mode as the key routing sees it. */
export function keyHostOf(playback: CatchupPlayback): CatchupKeyHost {
  const { deps } = playback;
  return {
    mode: () => modeOf(playback.state, deps.tuner.current),
    seekKeys: deps.seekKeys,
    skip: deps.skip,
    seekBy: (deltaMs) => playback.seekBy(deltaMs),
    rewindLive: (deltaMs) => void playback.hop.rewindFromLive(deps.tuner.current, deltaMs, deps.clock()),
    back: () => playback.back(),
  };
}
