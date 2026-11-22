// Feeds `<video>` events and `getVideoPlaybackQuality()` deltas into
// `PlaybackTelemetry` — the web stand-in for Android's Media3
// `AnalyticsListener` adapter. State labels follow Android's
// ("BUFFERING", "READY/playing", "READY/paused", "ENDED", "IDLE") so the two
// logs read alike side by side.
import type { PlaybackTelemetry } from './playbackTelemetry';
import { bufferedAheadMsOf, playbackQualityOf, positionMsOf } from './videoElement';

type Handler = () => void;

export class TelemetryAnalytics {
  private video: HTMLVideoElement | null = null;
  private bound: [string, Handler][] = [];
  private lastTotalFrames = 0;
  private lastDroppedFrames = 0;
  private lastSampleMs: number;

  constructor(
    private readonly telemetry: PlaybackTelemetry,
    private readonly clock: () => number = () => Date.now(),
  ) {
    this.lastSampleMs = clock();
  }

  bind(video: HTMLVideoElement): void {
    this.unbind();
    this.video = video;
    this.bound = [
      ['waiting', () => this.state('BUFFERING')],
      ['seeking', () => this.state('BUFFERING')],
      ['playing', () => this.state('READY/playing')],
      ['pause', () => this.state('READY/paused')],
      ['ended', () => this.state('ENDED')],
      ['emptied', () => this.state('IDLE')],
      [
        'error',
        () => this.telemetry.note(`player error ${video.error?.code ?? '?'}: ${video.error?.message ?? ''}`),
      ],
    ];
    for (const [event, handler] of this.bound) video.addEventListener(event, handler);
  }

  unbind(): void {
    for (const [event, handler] of this.bound) this.video?.removeEventListener(event, handler);
    this.bound = [];
    this.video = null;
  }

  /** The watchdog's tick: frame-count deltas stand in for a per-frame callback. */
  sample(): void {
    const video = this.video;
    if (video === null) return;
    const now = this.clock();
    const quality = playbackQualityOf(video);
    if (quality !== null) this.frames(quality, now - this.lastSampleMs);
    this.lastSampleMs = now;
    this.telemetry.onSample(!video.paused && !video.ended, positionMsOf(video), bufferedAheadMsOf(video));
  }

  private frames(quality: VideoPlaybackQuality, elapsedMs: number): void {
    if (quality.totalVideoFrames > this.lastTotalFrames) this.telemetry.onVideoFrame();
    const dropped = quality.droppedVideoFrames - this.lastDroppedFrames;
    if (dropped > 0) this.telemetry.onDroppedFrames(dropped, elapsedMs);
    this.lastTotalFrames = quality.totalVideoFrames;
    this.lastDroppedFrames = quality.droppedVideoFrames;
  }

  private state(label: string): void {
    if (this.video !== null) this.telemetry.onState(label, positionMsOf(this.video));
  }
}
