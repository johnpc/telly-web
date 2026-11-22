// The player engine seam (see CLAUDE.md "Player engine seam"): the UI and
// feature logic talk to this interface only, so unit tests inject a fake and
// never touch mpegts.js / hls.js / a real `<video>`. Port of Android's
// `PlayerEngine` + `TrackFacade`, widened with what the web `<video>` offers.
import type { EngineState } from './engineState';
import type { ResizeMode } from './resizeMode';
import type { StreamDetails } from './streamDetails';
import type { TrackSnapshot } from './trackModels';

export interface LoadOptions {
  /**
   * The provider's per-playlist User-Agent. Browsers forbid setting the
   * `User-Agent` request header from page script, so engines record it for
   * the CORS-proxy layer and otherwise ignore it (see the decisions log).
   */
  userAgent?: string;
  /** Resume position for finite streams (catch-up / VOD); live ignores it. */
  startPositionMs?: number;
  /** Live channel (chase the edge on reconnect) vs finite archive/VOD. */
  live: boolean;
}

/** How the web can honour an audio-sync offset (positive = audio delayed). */
export type AudioSyncSupport = 'delay-only' | 'unsupported';

export interface PlayerEngine {
  /** Current connection state; `subscribe` fires on every change. */
  readonly state: EngineState;
  /** True while user-paused; `load` and `stop` reset it. */
  readonly paused: boolean;
  subscribe(listener: () => void): () => void;

  /** Binds the `<video>` this engine drives (created by `createVideoElement`). */
  attach(video: HTMLVideoElement): void;
  /** The attached `<video>`, or null before `attach` / after `release`. */
  readonly video: HTMLVideoElement | null;
  /**
   * Re-parents the SAME `<video>` node into `container` (guide preview →
   * fullscreen hand-over) without touching the stream.
   */
  moveVideoTo(container: Element): void;

  load(url: string, options: LoadOptions): void;
  play(): void;
  pause(): void;
  stop(): void;
  release(): void;

  seekTo(positionMs: number): void;
  /** Current playback position in ms. */
  readonly positionMs: number;
  /** Duration in ms; `Number.POSITIVE_INFINITY` for live, 0 when unknown. */
  readonly durationMs: number;
  /** Buffered ranges in ms, as reported by the element. */
  readonly buffered: readonly { startMs: number; endMs: number }[];

  readonly tracks: TrackSnapshot;
  /** Applies a video override; null returns to adaptive "Auto". */
  selectVideoTrack(id: string | null): void;
  selectAudioTrack(id: string): void;
  /** Enables the given text track; null turns captions off. */
  selectTextTrack(id: string | null): void;

  /** Audio-sync offset in ms, positive = audio delayed (TiviMate's convention). */
  audioSyncMs: number;
  readonly audioSyncSupport: AudioSyncSupport;

  volume: number;
  muted: boolean;
  resizeMode: ResizeMode;

  /** Resolution / fps / channels for the info-overlay badges. */
  streamDetails(): StreamDetails;
}
