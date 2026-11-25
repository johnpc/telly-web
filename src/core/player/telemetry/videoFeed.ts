// The engine's stream-details bookkeeping (port of Android's
// `EngineVideoFeed`): a snapshot of what the element reports at READY
// (`videoWidth`/`videoHeight`), whatever the transport knows (codec fps,
// channel count), plus the render-time frame-rate estimate from
// `requestVideoFrameCallback` that fills in what TS containers do not report.
import { FrameRateEstimator } from './frameRateEstimator';
import type { StreamDetails } from './streamDetails';
import { mergeDetails, UNKNOWN_DETAILS } from './streamDetails';

const MICROS_PER_SECOND = 1_000_000;

export class VideoFeed {
  private current: StreamDetails = UNKNOWN_DETAILS;
  private frameRates = new FrameRateEstimator();
  private video: HTMLVideoElement | null = null;
  private generation = 0;

  constructor(private readonly onFrame: () => void = () => undefined) {}

  get details(): StreamDetails {
    return this.current;
  }

  attach(video: HTMLVideoElement): void {
    this.video = video;
    this.pump();
  }

  detach(): void {
    this.video = null;
    this.generation += 1;
  }

  /** A new stream starts a fresh frame-rate estimate and forgets the old formats. */
  reset(): void {
    this.current = UNKNOWN_DETAILS;
    this.frameRates = new FrameRateEstimator();
  }

  /** READY: the element knows the picture size now. */
  onReady(): void {
    if (this.video === null) return;
    this.merge({ width: this.video.videoWidth, height: this.video.videoHeight });
  }

  /** Transport facts fill only the still-unknown fields. */
  merge(patch: Partial<StreamDetails>): void {
    this.current = mergeDetails(this.current, patch);
  }

  /** One presented frame; TS formats report no fps, so the estimate fills it in. */
  onFrameAt(mediaTimeSeconds: number): void {
    this.onFrame();
    const fps = this.frameRates.onFrame(Math.round(mediaTimeSeconds * MICROS_PER_SECOND));
    if (fps !== null) this.merge({ frameRate: fps });
  }

  /** `requestVideoFrameCallback` where the browser has it; a detach retires the loop. */
  private pump(): void {
    const video = this.video;
    if (video === null || typeof video.requestVideoFrameCallback !== 'function') return;
    const generation = this.generation;
    video.requestVideoFrameCallback((_now, metadata) => {
      if (generation !== this.generation) return;
      this.onFrameAt(metadata.mediaTime);
      this.pump();
    });
  }
}
