/**
 * Observable picture-in-picture mode (Android `PipState`): the browser owns
 * the real window transitions (`enterpictureinpicture` /
 * `leavepictureinpicture` on the `<video>`); the playback slice reads it to
 * hide its chrome and to keep the stream alive while the window is tiny.
 */
// @stateMachine('Picture-in-picture')
export type PipMode = 'Windowed' | 'InPip';

export class PipState {
  private mode: PipMode = 'Windowed';
  private readonly listeners = new Set<() => void>();

  get current(): PipMode {
    return this.mode;
  }

  get inPip(): boolean {
    return this.mode === 'InPip';
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setInPip(value: boolean): void {
    const next: PipMode = value ? 'InPip' : 'Windowed';
    if (next === this.mode) return;
    this.mode = next;
    for (const listener of this.listeners) listener();
  }

  /** A background stop must never kill the stream while the PIP window is up. */
  allowsBackgroundStop(): boolean {
    return !this.inPip;
  }

  /** Mirrors the element's PIP events into this state; returns the unbind. */
  attach(video: HTMLVideoElement): () => void {
    const enter = (): void => this.setInPip(true);
    const leave = (): void => this.setInPip(false);
    video.addEventListener('enterpictureinpicture', enter);
    video.addEventListener('leavepictureinpicture', leave);
    return () => {
      video.removeEventListener('enterpictureinpicture', enter);
      video.removeEventListener('leavepictureinpicture', leave);
    };
  }
}

/** The one production instance the player chrome and the lifecycle share. */
export const sharedPipState = new PipState();
