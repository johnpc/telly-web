import { Observable } from '@/core/state/observable';

// @stateMachine('VOD transport visibility')
/**
 * The seek transport's auto-hide (Android `VodTransportVisibility`) as ONE
 * value with its timer inside: Hidden · Shown(hide) where `hide` is the armed
 * auto-hide timer while playing, or null while paused (pinned — the info
 * overlay's idiom, applied to VOD). Any interaction shows it and re-arms.
 */
export type TransportChrome =
  | { readonly kind: 'Hidden' }
  | { readonly kind: 'Shown'; readonly hide: ReturnType<typeof setTimeout> | null };

const HIDDEN: TransportChrome = { kind: 'Hidden' };

export class VodTransportVisibility extends Observable {
  private chrome: TransportChrome = HIDDEN;

  /** `hideAfterMs` is read on every poke so the Appearance setting applies live. */
  constructor(private readonly hideAfterMs: () => number) {
    super();
  }

  get state(): TransportChrome {
    return this.chrome;
  }

  get visible(): boolean {
    return this.chrome.kind === 'Shown';
  }

  poke(paused: boolean): void {
    this.cancelHide();
    const hide = paused ? null : setTimeout(() => this.set(HIDDEN), this.hideAfterMs());
    this.set({ kind: 'Shown', hide });
  }

  /** The visit ended: nothing may fire after it. */
  dispose(): void {
    this.cancelHide();
    this.set(HIDDEN);
  }

  private cancelHide(): void {
    if (this.chrome.kind === 'Shown' && this.chrome.hide !== null) clearTimeout(this.chrome.hide);
  }

  private set(next: TransportChrome): void {
    const changed = next.kind !== this.chrome.kind;
    this.chrome = next;
    if (changed) this.notify();
  }
}
