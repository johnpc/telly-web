// The picture a zap leaves behind. Every transport clears the element's
// source when it stops (mpegts.js and hls.js set `src = ''`, the native
// transport removes it), so the `<video>` goes black the instant a channel
// change starts — and stays black for the whole buffer-gate runway. The hold
// copies the last frame onto a canvas stacked over the element just before
// the old transport stops (`StreamSession.tune`), and drops it as soon as the
// engine stops waiting — Playing (the next picture is up), Idle (stopped),
// Ended or a terminal Error; only Buffering and Reconnecting keep it. The
// canvas follows the `<video>` between hosts (guide preview ↔ fullscreen)
// exactly like the element itself.
import { Observable } from '@/core/state/observable';
import type { EngineStateStore } from '../connection/engineState';

// @stateMachine('Zap frame hold')
/** Empty · Held — Held = the canvas shows the previous stream's last frame over the element. */
export type HeldFrame = { kind: 'Empty' } | { kind: 'Held' };

export const HELD_FRAME_TESTID = 'held-frame';
/** `readyState` at which the element has a decodable current frame (HAVE_CURRENT_DATA). */
const HAVE_CURRENT_DATA = 2;

export function createHoldCanvas(doc: Document = document): HTMLCanvasElement {
  const canvas = doc.createElement('canvas');
  canvas.dataset.testid = HELD_FRAME_TESTID;
  canvas.hidden = true;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.minWidth = '0';
  canvas.style.minHeight = '0';
  canvas.style.gridArea = '1 / 1';
  canvas.style.objectFit = 'contain';
  canvas.style.pointerEvents = 'none';
  return canvas;
}

/** True when the element shows a picture worth keeping. */
export function hasFrame(video: HTMLVideoElement): boolean {
  return video.readyState >= HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
}

function draw(canvas: HTMLCanvasElement, video: HTMLVideoElement): boolean {
  const context = canvas.getContext('2d');
  if (context === null) return false;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.style.objectFit = video.style.objectFit;
  try {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return true;
  } catch {
    return false;
  }
}

export class FrameHold extends Observable {
  readonly canvas: HTMLCanvasElement;
  private state: HeldFrame = { kind: 'Empty' };

  constructor(doc: Document = document) {
    super();
    this.canvas = createHoldCanvas(doc);
  }

  get current(): HeldFrame {
    return this.state;
  }

  /** Before the element loses its picture: keep it. Without a picture the previous hold (if any) stays. */
  capture(video: HTMLVideoElement): void {
    if (hasFrame(video) && draw(this.canvas, video)) this.set({ kind: 'Held' });
  }

  /** The next stream renders (or playback stops): the kept picture goes. */
  clear(): void {
    this.set({ kind: 'Empty' });
  }

  /** Derives the clears from the connection state: the hold lives only while the engine waits for a picture. */
  follow(store: EngineStateStore): void {
    store.subscribe(() => {
      const { kind } = store.get();
      if (kind !== 'Buffering' && kind !== 'Reconnecting') this.clear();
    });
  }

  /** Follows the `<video>` into its host; appended after it so it stacks on top. */
  moveTo(container: Element): void {
    if (this.canvas.parentElement !== container) container.appendChild(this.canvas);
  }

  remove(): void {
    this.canvas.remove();
  }

  private set(next: HeldFrame): void {
    if (next.kind === this.state.kind) return;
    this.state = next;
    this.canvas.hidden = next.kind === 'Empty';
    this.canvas.dataset.held = String(next.kind === 'Held');
    this.notify();
  }
}
