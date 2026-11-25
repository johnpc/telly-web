// One tuned stream's lifecycle inside the engine (the half of Android's
// `Media3PlayerEngine` that talks to the reconnector): begin → tune through
// the transport → READY resets the budget; an error or a watchdog stall arms
// a retry that re-tunes the SAME url on the SAME budget; `end` retires
// everything. Every connection-state write goes through the one store. The
// session also holds the engine's seat in the `Provider stream limit`
// registry (`StreamSlot`): an end that proves the one-stream line surfaces
// `STREAM_LIMITED` instead of a retry, and a tune that would be the second
// stream on a Limited host is refused before it connects. The zap frame hold
// is captured here, right before a (re)tune takes the element's picture away.
import type { LoadOptions } from './PlayerEngine';
import { ActiveStream } from '../connection/activeStream';
import type { EngineReconnector } from '../connection/engineReconnector';
import { BUFFERING, ENDED, PLAYING, type EngineStateStore } from '../connection/engineState';
import { STREAM_LIMITED, type StreamConcurrency } from '../connection/streamConcurrency';
import { StreamSlot } from '../connection/streamSlot';
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
  /** The `Provider stream limit` registry; the app's one instance unless a test injects its own. */
  concurrency?: StreamConcurrency | undefined;
  /** The engine's `Zap frame hold` (`FrameHold.capture`); tests without a picture leave it out. */
  frames?: { capture(video: HTMLVideoElement): void } | undefined;
}

export class StreamSession {
  private readonly active = new ActiveStream();
  private last: { url: string; options: LoadOptions } | null = null;

  constructor(
    private readonly deps: SessionDeps,
    private readonly slot = new StreamSlot(deps.concurrency),
  ) {}

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
    this.slot.close('Closed');
    if (this.slot.refuses(url, options)) return this.refuse();
    this.deps.store.set(BUFFERING);
    void this.tune(url, options);
  }

  /** Stop / release: drops the transport and retires any armed retry. */
  end(): void {
    this.deps.tuner.cancel();
    this.active.onStop();
    this.last = null;
    this.deps.reconnector.reset();
    this.slot.close('Closed');
  }

  /** READY: the budget resets so a drop hours later starts fresh. */
  onReady(): void {
    this.deps.reconnector.reset();
    this.deps.feed.onReady();
    this.deps.store.set(PLAYING);
  }

  /** The element reached the end of its media: a slate on a one-stream line, or the stream's own end. */
  onEnded(): void {
    this.deps.store.set(this.slot.close('Ended') ? STREAM_LIMITED : ENDED);
  }

  fail(message: string): void {
    if (this.last === null) return;
    this.deps.telemetry?.onLoadError(message);
    if (this.slot.close('Error')) return this.deps.store.set(STREAM_LIMITED);
    this.deps.store.set(this.deps.reconnector.onError(message, () => this.retry()));
  }

  onStall(): void {
    if (this.last !== null) this.deps.store.set(this.deps.reconnector.onStall(() => this.retry()));
  }

  /** The provider is known to carry one stream and another is open: no connection, the honest state. */
  private refuse(): void {
    this.deps.tuner.cancel();
    this.deps.store.set(STREAM_LIMITED);
  }

  private async tune(url: string, options: LoadOptions): Promise<void> {
    const video = this.deps.videoOf();
    if (video === null) return;
    this.deps.frames?.capture(video);
    try {
      if (await this.deps.tuner.tune(video, url, options, this.listener())) {
        this.slot.open(url, options);
        this.deps.onTuned(video);
      }
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
