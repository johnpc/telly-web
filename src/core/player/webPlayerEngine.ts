// The web `PlayerEngine` (port of Android's `Media3PlayerEngine`): one
// `<video>` reused across channel changes so the last frame stays up while
// the next stream tunes; a transport per url behind `StreamTuner`; the
// connection state written ONLY through the one store; auto-reconnect and
// the stall watchdog recovering on the shared budget (`StreamSession`);
// telemetry as a pure observer.
import type { LoadOptions, PlayerEngine } from './PlayerEngine';
import { scheduleOf, telemetryOf, tickerOf, type EngineDeps } from './engineDeps';
import { ObservableEngine } from './engineObservable';
import { EngineReconnector } from './engineReconnector';
import { BUFFERING, ENDED, IDLE } from './engineState';
import { wireVideo } from './engineWiring';
import type { PlaybackTelemetry } from './playbackTelemetry';
import { ReconnectPolicy } from './reconnectPolicy';
import type { Ticker } from './stallWatchdog';
import type { StreamDetails } from './streamDetails';
import { StreamSession } from './streamSession';
import { StreamTuner } from './streamTuner';
import { TelemetryAnalytics } from './telemetryAnalytics';
import { NO_TRACKS } from './trackModels';
import { safePlay } from './videoElement';
import { VideoFeed } from './videoFeed';

export class WebPlayerEngine extends ObservableEngine implements PlayerEngine {
  private readonly tuner: StreamTuner;
  private readonly session: StreamSession;
  private readonly telemetry: PlaybackTelemetry | null;
  private readonly analytics: TelemetryAnalytics | null;
  private readonly feed: VideoFeed;
  private readonly ticker: Ticker | null;
  private unwire: () => void = () => undefined;

  constructor(deps: EngineDeps) {
    super();
    this.tuner = new StreamTuner(deps.transportFor);
    this.ticker = tickerOf(deps);
    this.telemetry = telemetryOf(deps);
    this.analytics = this.telemetry === null ? null : new TelemetryAnalytics(this.telemetry);
    this.feed = new VideoFeed(() => this.telemetry?.onVideoFrame());
    this.session = new StreamSession({
      tuner: this.tuner,
      reconnector: new EngineReconnector(deps.policy ?? new ReconnectPolicy(), scheduleOf(deps)),
      store: this.store,
      feed: this.feed,
      telemetry: this.telemetry,
      videoOf: () => this.video,
      onTracks: (snapshot) => this.setTracks(snapshot),
      onTuned: (video) => this.start(video),
    });
  }

  override attach(video: HTMLVideoElement): void {
    super.attach(video);
    this.unwire = wireVideo(video, {
      onBuffering: () => this.store.set(BUFFERING),
      onReady: () => this.session.onReady(),
      onEnded: () => this.store.set(ENDED),
      onError: (message) => this.session.fail(message),
      stateOf: () => this.state,
      onStall: () => this.session.onStall(),
      analytics: this.analytics,
      feed: this.feed,
      ticker: this.ticker,
    });
  }

  /** Skips a re-load of the same stream (guide <-> fullscreen hand-over). */
  load(url: string, options: LoadOptions): void {
    this.session.begin(url, options, this.paused);
    this.setPaused(false);
  }

  stop(): void {
    this.session.end();
    this.setTracks(NO_TRACKS);
    this.store.set(IDLE);
    this.setPaused(false);
  }

  release(): void {
    this.stop();
    this.unwire();
    this.unwire = () => undefined;
    this.detachElement();
  }

  play(): void {
    if (this.video !== null) this.start(this.video);
    this.setPaused(false);
  }

  pause(): void {
    this.video?.pause();
    this.setPaused(true);
  }

  selectVideoTrack(id: string | null): void {
    this.tuner.current?.selectVideo(id);
  }

  selectAudioTrack(id: string): void {
    this.tuner.current?.selectAudio(id);
  }

  selectTextTrack(id: string | null): void {
    this.tuner.current?.selectText(id);
  }

  streamDetails(): StreamDetails {
    return this.feed.details;
  }

  private start(video: HTMLVideoElement): void {
    safePlay(video);
    this.resumeAudioGraph();
  }
}
