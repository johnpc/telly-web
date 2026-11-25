// The library-facing half of the seam: one Transport per media library
// (mpegts.js, hls.js, the bare `<video>`). `WebPlayerEngine` owns the state
// machine, the `<video>` and the reconnect/stall logic; a Transport only
// knows how to put bytes for ONE url into the element and how to map that
// library's track model. Swapped per load, because one shared engine plays
// `.ts` channels, HLS channels and MP4 VOD in turn.
import type { LoadOptions } from '../engine/PlayerEngine';
import type { StreamDetails } from '../telemetry/streamDetails';
import type { TrackSnapshot } from '../engine/trackModels';

export type TransportKind = 'mpegts' | 'hls' | 'native';

export interface TransportListener {
  onTracksChanged(snapshot: TrackSnapshot): void;
  /** Library-known facts (codec fps, channel count); unknown fields omitted. */
  onDetails(details: Partial<StreamDetails>): void;
  /** A fatal library error; the engine runs its reconnect budget. */
  onError(message: string): void;
}

export interface Transport {
  readonly kind: TransportKind;
  /** Binds the library to `video` and starts loading `url`; rejects on setup failure. */
  load(
    video: HTMLVideoElement,
    url: string,
    options: LoadOptions,
    listener: TransportListener,
  ): Promise<void>;
  /** Tears the library instance down and unbinds the element (which stays in the DOM). */
  stop(): void;
  readonly tracks: TrackSnapshot;
  selectVideo(id: string | null): void;
  selectAudio(id: string): void;
  selectText(id: string | null): void;
}

/** A displayable message for whatever a library threw. */
export function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'UNKNOWN_ERROR';
}
