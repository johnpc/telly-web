// One tuned stream's lifecycle inside the engine (the half of Android's
// `Media3PlayerEngine` that talks to the reconnector): begin → tune through
// the transport → READY resets the budget; an error or a watchdog stall arms
// a retry that re-tunes the SAME url on the SAME budget; `end` retires
// everything. Every connection-state write goes through the one store.
import type { LoadOptions } from './PlayerEngine';
import { ActiveStream } from '../connection/activeStream';
import type { EngineReconnector } from '../connection/engineReconnector';
import { BUFFERING, PLAYING, type EngineStateStore } from '../connection/engineState';
import { streamLabel, type PlaybackTelemetry } from '../telemetry/playbackTelemetry';
import type { StreamTuner } from '../transport/streamTuner';
import type { TrackSnapshot } from './trackModels';
import { messageOf, type TransportListener } from '../transport/transport';
import type { VideoFeed } from '../telemetry/videoFeed';

export interface SessionDeps {
  tuner: StreamTuner;
  reconnector: EngineReconnector;
  store: EngineStateStore;
  feed: VideoFeed;
  telemetry: PlaybackTelemetry | null;
  videoOf: () => HTMLVideoElement | null;
  onTracks: (snapshot: TrackSnapshot) => void;
  /** The stream is bound and wanted: start the element. */
  onTuned: (video: HTMLVideoElement) => void;
}

export class StreamSession {
  private readonly active = new ActiveStream();
  private last: { url: string; options: LoadOptions } | null = null;

  constructor(private readonly deps: SessionDeps) {}

  /**
   * A new stream: fresh budget, fresh formats, Buffering, tune. A re-load of
   * the stream already playing is skipped (guide <-> fullscreen hand-over).
   */
  begin(url: string, options: LoadOptions, paused: boolean): void {
    if (this.active.isCurrent(url, this.deps.store.get(), paused)) return;
    this.active.onLoad(url);
    this.last = { url, options };
    this.deps.reconnector.reset();
    this.deps.feed.reset();
    this.deps.telemetry?.onLoad(streamLabel(url));
    this.deps.store.set(BUFFERING);
    void this.tune(url, options);
  }

  /** Stop / release: drops the transport and retires any armed retry. */
  end(): void {
    this.deps.tuner.cancel();
    this.active.onStop();
    this.last = null;
    this.deps.reconnector.reset();
  }

  /** READY: the budget resets so a drop hours later starts fresh. */
  onReady(): void {
    this.deps.reconnector.reset();
    this.deps.feed.onReady();
    this.deps.store.set(PLAYING);
  }

  fail(message: string): void {
    if (this.last === null) return;
    this.deps.telemetry?.onLoadError(message);
    this.deps.store.set(this.deps.reconnector.onError(message, () => this.retry()));
  }

  onStall(): void {
    if (this.last !== null) this.deps.store.set(this.deps.reconnector.onStall(() => this.retry()));
  }

  private async tune(url: string, options: LoadOptions): Promise<void> {
    const video = this.deps.videoOf();
    if (video === null) return;
    try {
      if (await this.deps.tuner.tune(video, url, options, this.listener())) this.deps.onTuned(video);
    } catch (error) {
      this.fail(messageOf(error));
    }
  }

  /** A re-prepare of the current stream on the reconnect budget (never resets it). */
  private retry(): void {
    if (this.last !== null) void this.tune(this.last.url, this.last.options);
  }

  private listener(): TransportListener {
    return {
      onTracksChanged: (snapshot) => this.deps.onTracks(snapshot),
      onDetails: (details) => this.deps.feed.merge(details),
      onError: (message) => this.fail(message),
    };
  }
}
