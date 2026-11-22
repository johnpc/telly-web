// Tracks the URL the engine is currently streaming so a re-load of the very
// same stream is recognized and skipped: the guide preview and fullscreen
// playback share one engine and each re-tunes the last channel on entry, so
// honoring that load would only rebuffer the picture mid-hand-over.
// Port of Android's `ActiveStream`.
import type { EngineState } from './engineState';
import { isStreaming } from './engineState';

export class ActiveStream {
  private url: string | null = null;

  /** The URL being streamed, or null after `onStop`. */
  get current(): string | null {
    return this.url;
  }

  onLoad(streamUrl: string): void {
    this.url = streamUrl;
  }

  onStop(): void {
    this.url = null;
  }

  /** True while `streamUrl` is already the live, unpaused pipeline. */
  isCurrent(streamUrl: string, state: EngineState, paused: boolean): boolean {
    return streamUrl === this.url && !paused && isStreaming(state);
  }
}
