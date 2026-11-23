import type { RemoteKey } from '@/core/input/remoteKeys';
import { JUMP_STEP_MS, SEEK_STEP_MS, type VodPlayerControls } from './vodPlayerControls';

/**
 * VOD transport key map (ux-spec §VOD + §3.6, Android `onVodPlaybackKey`):
 * OK (and the web's Play/Pause key) pauses, LEFT/RIGHT seek by the skip
 * step, RW/FF jump further, UP/DOWN just reveal the transport. BACK stays
 * unhandled here so the screen's scope persists the position and pops.
 */
export function onVodPlaybackKey(key: RemoteKey, controls: VodPlayerControls): boolean {
  switch (key) {
    case 'OK':
    case 'PLAY_PAUSE':
      controls.togglePause();
      return true;
    case 'LEFT':
      controls.seekBy(-SEEK_STEP_MS);
      return true;
    case 'RIGHT':
      controls.seekBy(SEEK_STEP_MS);
      return true;
    case 'REWIND':
      controls.seekBy(-JUMP_STEP_MS);
      return true;
    case 'FAST_FORWARD':
      controls.seekBy(JUMP_STEP_MS);
      return true;
    case 'UP':
    case 'DOWN':
      controls.transport.poke(controls.paused);
      return true;
    default:
      return false;
  }
}
