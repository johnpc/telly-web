import { Observable } from '@/features/guide/observable';

/**
 * The seek transport's auto-hide (Android `VodTransportVisibility`): any
 * interaction shows it, it fades after the player-panel timeout while
 * playing, and it stays up while paused (the info overlay's idiom, applied
 * to VOD).
 */
export class VodTransportVisibility extends Observable {
  private shown = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** `hideAfterMs` is read on every poke so the Appearance setting applies live. */
  constructor(private readonly hideAfterMs: () => number) {
    super();
  }

  get visible(): boolean {
    return this.shown;
  }

  poke(paused: boolean): void {
    this.cancelHide();
    this.show(true);
    if (paused) return;
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.show(false);
    }, this.hideAfterMs());
  }

  dispose(): void {
    this.cancelHide();
  }

  private show(value: boolean): void {
    if (this.shown === value) return;
    this.shown = value;
    this.notify();
  }

  private cancelHide(): void {
    if (this.hideTimer === null) return;
    clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
}
