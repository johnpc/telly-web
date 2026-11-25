// @stateMachine('Playback health monitor')
//
// Playback health log, one line per notable event, so a reported freeze can
// be matched to what the player actually did (the browser console, filtered
// on `telly-play`, is the web `adb logcat -s telly-play`): state changes with
// how long the previous state lasted (a Playing -> Buffering -> Playing pair
// is a rebuffer and its duration), VIDEO FROZEN when no frame has rendered
// for FROZEN_VIDEO_MS while the audio clock keeps advancing (a decoder or
// timestamp stall the position-based StallDetector cannot see), dropped-frame
// bursts, load errors and notes. Observation only — never drives playback.
// Port of Android's `PlaybackTelemetry`; clock and log injected.

/** A second without a frame at broadcast rates (25–60 fps) is a visible freeze. */
export const FROZEN_VIDEO_MS = 1_000;

/** Fewer dropped frames than this per report are not visible. */
export const DROPPED_BURST = 5;

/** The console tag Playwright filters on. */
export const LOG_TAG = 'telly-play';

const NOT_FROZEN = -1;

export type TelemetryLog = (line: string) => void;

export const consoleTelemetryLog: TelemetryLog = (line) => console.info(LOG_TAG, line);

export class PlaybackTelemetry {
  private state = 'IDLE';
  private stateSinceMs: number;
  private lastFrameMs = 0;
  private framesSinceLoad = false;
  private frozenSinceMs = NOT_FROZEN;
  private lastPositionMs = -1;

  constructor(
    private readonly clock: () => number,
    private readonly log: TelemetryLog,
  ) {
    this.stateSinceMs = clock();
  }

  /** Rendering · VideoFrozen(since) — the monitor's own mode, for tests. */
  get frozenSince(): number | null {
    return this.frozenSinceMs === NOT_FROZEN ? null : this.frozenSinceMs;
  }

  onLoad(stream: string): void {
    this.log(`tune ${stream}`);
    this.framesSinceLoad = false;
    this.frozenSinceMs = NOT_FROZEN;
  }

  /** `next` = the player's state label (IDLE / BUFFERING / READY/playing / ENDED …). */
  onState(next: string, positionMs: number): void {
    if (next === this.state) return;
    this.log(`state ${this.state} -> ${next} after ${this.clock() - this.stateSinceMs}ms at ${positionMs}ms`);
    this.state = next;
    this.stateSinceMs = this.clock();
  }

  /** Every rendered frame (`requestVideoFrameCallback` or a frame-count delta). */
  onVideoFrame(): void {
    const now = this.clock();
    if (this.frozenSinceMs !== NOT_FROZEN)
      this.log(`video resumed after ${now - this.frozenSinceMs}ms frozen`);
    this.frozenSinceMs = NOT_FROZEN;
    this.lastFrameMs = now;
    this.framesSinceLoad = true;
  }

  /** The watchdog's periodic sample: audio clock advancing, no new frame. */
  onSample(playing: boolean, positionMs: number, bufferedMs: number): void {
    const audioAdvancing = playing && positionMs !== this.lastPositionMs;
    this.lastPositionMs = positionMs;
    const gapMs = this.clock() - this.lastFrameMs;
    if (audioAdvancing && this.newFreeze(gapMs)) {
      this.frozenSinceMs = this.lastFrameMs;
      this.log(`VIDEO FROZEN: no frame for ${gapMs}ms while audio advances, ${bufferedMs}ms buffered`);
    }
  }

  /** Video had rendered since the tune, is not already reported, and stopped FROZEN_VIDEO_MS ago. */
  private newFreeze(gapMs: number): boolean {
    return this.framesSinceLoad && this.frozenSinceMs === NOT_FROZEN && gapMs >= FROZEN_VIDEO_MS;
  }

  onDroppedFrames(count: number, elapsedMs: number): void {
    if (count >= DROPPED_BURST) this.log(`dropped ${count} frames in ${elapsedMs}ms`);
  }

  onLoadError(cause: string): void {
    this.log(`load error: ${cause}`);
  }

  /** Engine kind, codecs, formats: the facts the TiviMate comparison needs. */
  note(message: string): void {
    this.log(message);
  }
}

/** A loggable stream label: host + last path segment, never credentials or query tokens. */
export function streamLabel(url: string): string {
  const parsed = parseUrl(url);
  if (parsed === null) return url.split('?')[0] ?? '';
  const last = parsed.pathname.slice(parsed.pathname.lastIndexOf('/') + 1);
  return last === '' ? parsed.host : `${parsed.host}/…/${last}`;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
