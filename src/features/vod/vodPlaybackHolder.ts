import type { VodPlaybackViewModel } from './vodPlaybackViewModel';

/**
 * One ViewModel per subscriber set (the `LeaseHolder` idiom): built and
 * started on the first subscribe, released on the last unsubscribe — so the
 * screen's own engine lives exactly as long as the screen is on, and React's
 * StrictMode double-subscribe just builds a second, clean visit.
 */
export class VodPlaybackHolder {
  private viewModel: VodPlaybackViewModel | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly create: () => VodPlaybackViewModel) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.viewModel === null) this.open();
    return () => this.close(listener);
  };

  readonly getSnapshot = (): VodPlaybackViewModel | null => this.viewModel;

  private open(): void {
    const created = this.create();
    this.viewModel = created;
    void created.start();
  }

  private close(listener: () => void): void {
    this.listeners.delete(listener);
    if (this.listeners.size > 0) return;
    this.viewModel?.release();
    this.viewModel = null;
  }
}
