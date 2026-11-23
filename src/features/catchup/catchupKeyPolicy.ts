import type { SimpleRemoteKey } from '@/core/input/remoteKeys';
import type { PlaybackOverlay } from '@/features/playback/overlay/playbackOverlay';
import type { CatchupSkip } from './skipSteps';

/** What a catch-up-aware key press should do. */
export type CatchupCommand =
  | { kind: 'Seek'; deltaMs: number }
  /** Jump into catch-up of the airing programme at live edge − deltaMs. */
  | { kind: 'RewindLive'; deltaMs: number }
  /** BACK at bare catch-up playback: return to live / the guide. */
  | { kind: 'Back' };

/** How catch-up relates to what is playing right now. */
export type CatchupMode = 'None' | 'LiveCapable' | 'Playing';

/** Which seek keys the Remote-control settings currently enable. */
export interface CatchupSeekKeys {
  rwFf: boolean;
  leftRight: boolean;
  downUp: boolean;
  rwLive: boolean;
  leftLive: boolean;
  downLive: boolean;
}

export const DEFAULT_SEEK_KEYS: CatchupSeekKeys = {
  rwFf: true,
  leftRight: false,
  downUp: false,
  rwLive: false,
  leftLive: false,
  downLive: false,
};

const seek = (deltaMs: number): CatchupCommand => ({ kind: 'Seek', deltaMs });
const rewindLive = (deltaMs: number): CatchupCommand => ({ kind: 'RewindLive', deltaMs });
const BACK: CatchupCommand = { kind: 'Back' };

/** Bare playback + the transient overlays; sticky layers keep their own keys. */
function transient(overlay: PlaybackOverlay): boolean {
  return (
    overlay.kind === 'None' ||
    overlay.kind === 'Info' ||
    overlay.kind === 'InfoTransport' ||
    overlay.kind === 'ZapInfo'
  );
}

/** The "rewind live with catch-up" toggles (RW anywhere transient, LEFT/DOWN at bare playback). */
function duringLive(
  overlay: PlaybackOverlay,
  key: SimpleRemoteKey,
  keys: CatchupSeekKeys,
  skip: CatchupSkip,
): CatchupCommand | null {
  if (key === 'REWIND' && keys.rwLive) return rewindLive(skip.backMs);
  if (overlay.kind !== 'None') return null;
  if (key === 'LEFT' && keys.leftLive) return rewindLive(skip.backMs);
  return key === 'DOWN' && keys.downLive ? rewindLive(skip.backMs) : null;
}

/** D-pad seeks + BACK apply at bare playback only (overlays own those keys). */
function atBareCatchup(
  key: SimpleRemoteKey,
  keys: CatchupSeekKeys,
  skip: CatchupSkip,
): CatchupCommand | null {
  if (key === 'LEFT' && keys.leftRight) return seek(-skip.backMs);
  if (key === 'RIGHT' && keys.leftRight) return seek(skip.forwardMs);
  if (key === 'DOWN' && keys.downUp) return seek(-skip.backMs);
  if (key === 'UP' && keys.downUp) return seek(skip.forwardMs);
  return key === 'BACK' ? BACK : null;
}

function duringCatchup(
  overlay: PlaybackOverlay,
  key: SimpleRemoteKey,
  keys: CatchupSeekKeys,
  skip: CatchupSkip,
): CatchupCommand | null {
  if (key === 'REWIND' && keys.rwFf) return seek(-skip.backMs);
  if (key === 'FAST_FORWARD' && keys.rwFf) return seek(skip.forwardMs);
  return overlay.kind === 'None' ? atBareCatchup(key, keys, skip) : null;
}

/**
 * The catch-up context EXTENDING the playback key policy (Android
 * `CatchupKeyPolicy`): consulted first, and only for the keys the
 * Remote-control toggles hand to seeking; everything it declines falls
 * through to the live key map unchanged. RW/FF work over the transient
 * overlays too; LEFT/RIGHT and DOWN/UP seeks apply at bare playback only,
 * where the live map has those keys unbound (the info overlay needs them
 * for card focus).
 */
export function catchupCommandFor(
  overlay: PlaybackOverlay,
  key: SimpleRemoteKey,
  mode: CatchupMode,
  keys: CatchupSeekKeys,
  skip: CatchupSkip,
): CatchupCommand | null {
  if (mode === 'None' || !transient(overlay)) return null;
  return mode === 'LiveCapable'
    ? duringLive(overlay, key, keys, skip)
    : duringCatchup(overlay, key, keys, skip);
}
