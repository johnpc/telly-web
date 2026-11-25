// Bare `<video src>` transport: MP4 / WebM progressive files and HLS on
// browsers with native HLS but no MSE (Safari on iPhone). Errors arrive via
// the element's `error` event, which `videoEvents.ts` already maps, so this
// transport is nearly inert. The element's `audioTracks` / `textTracks`
// collections are Safari-only and shape-shift across engines, so native
// playback exposes no pickers (the Android app shows none for MP4 either).
// The buffer gate is attached per tune like every transport: the browser
// keeps downloading while the element is held, and a progressive file
// buffered to its end plays out below the runway.
import type { LoadOptions } from '../engine/PlayerEngine';
import { attachBufferGate } from '../gate/bufferGate';
import { NO_TRACKS, type TrackSnapshot } from '../engine/trackModels';
import type { Transport, TransportListener } from './transport';

const NO_GATE = (): void => undefined;

export class NativeTransport implements Transport {
  readonly kind = 'native';
  readonly tracks: TrackSnapshot = NO_TRACKS;
  private video: HTMLVideoElement | null = null;
  private onMetadata: (() => void) | null = null;
  private detachGate = NO_GATE;

  load(
    video: HTMLVideoElement,
    url: string,
    options: LoadOptions,
    listener: TransportListener,
  ): Promise<void> {
    this.stop();
    this.video = video;
    if (options.startPositionMs !== undefined && options.startPositionMs > 0) {
      const startSeconds = options.startPositionMs / 1000;
      this.onMetadata = () => {
        video.currentTime = startSeconds;
      };
      video.addEventListener('loadedmetadata', this.onMetadata, { once: true });
    }
    video.src = url;
    video.load();
    this.detachGate = attachBufferGate(video, options).detach;
    listener.onTracksChanged(NO_TRACKS);
    listener.onDetails({ width: video.videoWidth, height: video.videoHeight });
    return Promise.resolve();
  }

  stop(): void {
    this.detachGate();
    this.detachGate = NO_GATE;
    const video = this.video;
    this.video = null;
    if (video === null) return;
    this.cancelSeek(video);
    video.removeAttribute('src');
    video.load();
  }

  private cancelSeek(video: HTMLVideoElement): void {
    if (this.onMetadata !== null) video.removeEventListener('loadedmetadata', this.onMetadata);
    this.onMetadata = null;
  }

  selectVideo(): void {
    return undefined;
  }

  selectAudio(): void {
    return undefined;
  }

  selectText(): void {
    return undefined;
  }
}
