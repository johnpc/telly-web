// Derives the stream frame rate from video-frame presentation timestamps —
// raw TS streams don't carry it in the container, but TiviMate still shows
// "25 FPS". Port of Android's `FrameRateEstimator`; on the web the frames
// come from `requestVideoFrameCallback` (`metadata.mediaTime`). Pure logic:
// feed `onFrame` consecutive presentation times in microseconds, get an
// estimate once enough consistent deltas exist.

const DEFAULT_SAMPLES = 12;
const MICROS_PER_SECOND = 1_000_000;

export class FrameRateEstimator {
  private readonly deltasUs: number[] = [];
  private lastUs: number | null = null;
  private estimated = false;

  constructor(private readonly samples: number = DEFAULT_SAMPLES) {}

  /**
   * Returns the estimated fps once `samples` deltas agree, else null.
   * One-shot: after the estimate this goes quiet — the caller rides the
   * per-frame callback, so no work past the answer.
   */
  onFrame(presentationTimeUs: number): number | null {
    if (this.estimated) return null;
    const previous = this.lastUs;
    this.lastUs = presentationTimeUs;
    if (previous !== null) this.record(presentationTimeUs - previous);
    if (this.deltasUs.length < this.samples) return null;
    this.estimated = true;
    return MICROS_PER_SECOND / this.median();
  }

  private record(deltaUs: number): void {
    if (deltaUs <= 0) {
      this.deltasUs.length = 0;
      return;
    }
    this.deltasUs.push(deltaUs);
    if (this.deltasUs.length > this.samples) this.deltasUs.shift();
  }

  /** The median delta shrugs off single late/early frames. */
  private median(): number {
    const sorted = [...this.deltasUs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 1;
  }
}
