// The measurements behind the buffer gate: how much media is buffered past
// the playhead, whether a finite file is already buffered to its end, the
// runway each Settings → Playback → Buffer size asks for, and how fast the
// pipe fills (a provider that delivers at ~1× realtime cannot build runway
// while playing, so the gate must build it before the first frame).

export interface BufferThresholds {
  /** Seconds buffered ahead before the first frame plays (on a bursting pipe). */
  startAheadSec: number;
  /** Seconds buffered ahead before playback resumes after a stall — and before the first frame on a 1× pipe. */
  resumeAheadSec: number;
}

const THRESHOLDS: Readonly<Record<string, BufferThresholds>> = {
  Small: { startAheadSec: 2, resumeAheadSec: 6 },
  Medium: { startAheadSec: 5, resumeAheadSec: 8 },
  Large: { startAheadSec: 8, resumeAheadSec: 12 },
};

export function thresholdsFor(bufferSize: string): BufferThresholds {
  return THRESHOLDS[bufferSize] ?? THRESHOLDS['Small'] ?? { startAheadSec: 2, resumeAheadSec: 6 };
}

/** Seconds of media buffered beyond the playhead. */
export function bufferedAhead(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  for (let i = buffered.length - 1; i >= 0; i -= 1) {
    if (buffered.start(i) <= currentTime + 0.25) return Math.max(0, buffered.end(i) - currentTime);
  }
  return 0;
}

/** A finite file whose buffer reaches its end has all the runway there is (the archive must be allowed to finish). */
export function bufferedToEnd(video: HTMLVideoElement): boolean {
  const { duration, buffered } = video;
  if (!Number.isFinite(duration) || buffered.length === 0) return false;
  return buffered.end(buffered.length - 1) >= duration - 0.3;
}

/**
 * Media seconds per wall second a pipe must deliver (connect time included)
 * for a short runway to keep growing once playback consumes it at 1×.
 * Measured 2026-11-23 on a real provider through the TLS relay: a cold
 * connection yields 1.0–1.5 MB in its first 2 s of a ~0.9 MB/s stream, i.e.
 * under 1× — a 2 s runway drained to 0.06 s within 5 s of playing.
 */
export const BURST_RATIO = 1.5;

/** How fast buffered media has arrived since the clock was (re)started. */
export class FillRate {
  private since: number;

  constructor(private readonly now: () => number = () => performance.now()) {
    this.since = now();
  }

  reset(): void {
    this.since = this.now();
  }

  /** True when `ahead` seconds arrived fast enough to keep arriving faster than they play. */
  bursting(ahead: number): boolean {
    const elapsed = (this.now() - this.since) / 1000;
    return elapsed <= 0 || ahead / elapsed >= BURST_RATIO;
  }
}
