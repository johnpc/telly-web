// The element-bound half of `PlayerEngine`: everything that is a plain read
// or write on the attached `<video>` (position, duration, buffered ranges,
// volume, mute, object-fit resize mode, audio-sync delay, re-parenting).
// `WebPlayerEngine` extends this with the stream/state logic so neither file
// needs delegation boilerplate.
import type { AudioSyncSupport } from './PlayerEngine';
import { AudioSyncDelay } from '../video/audioSync';
import type { EngineStateKind } from '../connection/engineState';
import type { ResizeMode } from '../video/resizeMode';
import { objectFitOf } from '../video/resizeMode';
import type { BufferedRange } from '../video/videoElement';
import { bufferedRangesOf, durationMsOf, moveVideoTo, positionMsOf } from '../video/videoElement';

export abstract class MediaElementEngine {
  private element: HTMLVideoElement | null = null;
  private fit: ResizeMode = 'Fit';
  private sync: AudioSyncDelay | null = null;
  private level = 1;
  private mute = false;

  get video(): HTMLVideoElement | null {
    return this.element;
  }

  attach(video: HTMLVideoElement): void {
    this.element = video;
    this.sync = new AudioSyncDelay(video);
    video.style.objectFit = objectFitOf(this.fit);
    video.volume = this.level;
    video.muted = this.mute;
  }

  /** Release: the node leaves the DOM; the next engine build creates a fresh one. */
  protected detachElement(): void {
    this.sync?.release();
    this.sync = null;
    this.element?.remove();
    this.element = null;
  }

  protected resumeAudioGraph(): void {
    this.sync?.resume();
  }

  protected setDataState(kind: EngineStateKind): void {
    if (this.element !== null) this.element.dataset.state = kind;
  }

  moveVideoTo(container: Element): void {
    if (this.element !== null) moveVideoTo(this.element, container);
  }

  seekTo(positionMs: number): void {
    if (this.element !== null) this.element.currentTime = Math.max(0, positionMs) / 1000;
  }

  get positionMs(): number {
    return this.element === null ? 0 : positionMsOf(this.element);
  }

  get durationMs(): number {
    return this.element === null ? 0 : durationMsOf(this.element);
  }

  get buffered(): readonly BufferedRange[] {
    return this.element === null ? [] : bufferedRangesOf(this.element);
  }

  get volume(): number {
    return this.level;
  }

  set volume(value: number) {
    this.level = Math.min(Math.max(value, 0), 1);
    if (this.element !== null) this.element.volume = this.level;
  }

  get muted(): boolean {
    return this.mute;
  }

  /** Multiview audio ownership: only the focused pane's engine is unmuted. */
  set muted(value: boolean) {
    this.mute = value;
    if (this.element !== null) this.element.muted = value;
  }

  get resizeMode(): ResizeMode {
    return this.fit;
  }

  set resizeMode(mode: ResizeMode) {
    this.fit = mode;
    if (this.element !== null) this.element.style.objectFit = objectFitOf(mode);
  }

  get audioSyncMs(): number {
    return this.sync?.offsetMs ?? 0;
  }

  set audioSyncMs(ms: number) {
    this.sync?.set(ms);
  }

  get audioSyncSupport(): AudioSyncSupport {
    return this.sync?.support ?? 'unsupported';
  }
}
