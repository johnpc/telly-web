import type { RemoteKey } from '@/core/input/remoteKeys';
import type { PlayerEngine } from '@/core/player';
import { createTransport, extensionOf } from '@/core/player/createEngine';
import type { EngineDeps } from '@/core/player/engineDeps';
import { spanText } from '@/core/time';

export const SEEK_STEP_MS = 10_000;
export const TRANSPORT_POLL_MS = 500;

/** The engine seam a capture file plays through: `.mp4` natively, everything else via mpegts.js. */
export function transportForCapture(filePath: string): EngineDeps['transportFor'] {
  const kind = extensionOf(filePath) === 'mp4' ? 'native' : 'mpegts';
  return () => Promise.resolve(createTransport(kind));
}

/** "00:16 / 45:00" — the capture player's position readout. */
export function transportText(positionMs: number, durationMs: number): string {
  return `${spanText(positionMs)} / ${spanText(Number.isFinite(durationMs) ? durationMs : 0)}`;
}

export function progressFraction(positionMs: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, positionMs / durationMs));
}

type CapturePlayer = Pick<PlayerEngine, 'state' | 'paused' | 'positionMs' | 'seekTo' | 'play' | 'pause'>;

/**
 * OK: pause/resume — and at the capture's end (the player stops on its last
 * frame with the transport showing the full progress) it replays from the
 * start instead of toggling a dead pause flag.
 */
export function toggleCapturePlayback(engine: CapturePlayer): void {
  if (engine.state.kind === 'Ended') {
    engine.seekTo(0);
    engine.play();
  } else if (engine.paused) engine.play();
  else engine.pause();
}

/** Capture-player D-pad map: LEFT/RIGHT seek ±10 s, OK / play-pause toggle; BACK is the host's. */
export function onCapturePlayerKey(key: RemoteKey, engine: CapturePlayer): boolean {
  if (key === 'LEFT' || key === 'REWIND') engine.seekTo(Math.max(0, engine.positionMs - SEEK_STEP_MS));
  else if (key === 'RIGHT' || key === 'FAST_FORWARD') engine.seekTo(engine.positionMs + SEEK_STEP_MS);
  else if (key === 'OK' || key === 'PLAY_PAUSE') toggleCapturePlayback(engine);
  else return false;
  return true;
}
