import { resizeModeOf, type PlayerEngine } from '@/core/player';

/** Settings → Playback → Resize mode, applied to the fullscreen engine. */
export function applyResizeMode(engine: Pick<PlayerEngine, 'resizeMode'>, raw: string): void {
  engine.resizeMode = resizeModeOf(raw);
}
