import type { TuneController } from '../tune/tuneController';
import type { OverlayState } from './overlayState';
import { DEFAULT_PANEL_TIMEOUTS, type PanelTimeouts } from './panelTimeouts';
import {
  INFO,
  INFO_TRANSPORT,
  NONE,
  PANEL,
  QUICK_BAR,
  ZAP_INFO,
  type PlaybackOverlay,
} from './playbackOverlay';

/** What a key press (or a menu row) should do given the active overlay. */
export type PlaybackCommand =
  | { kind: 'ShowInfo' }
  | { kind: 'ShowTransport' }
  /** Catch-up pause: the transport stays up (sticky) until resume re-arms its auto-hide. */
  | { kind: 'PinTransport' }
  | { kind: 'ExitToGuide' }
  | { kind: 'Zap'; delta: number }
  | { kind: 'OpenQuickBar' }
  | { kind: 'Dismiss' }
  | { kind: 'BackToPanel' }
  /** One-level BACK from a pushed screen (coming-soon, description, picker, …). */
  | { kind: 'PopTo'; overlay: PlaybackOverlay }
  /** Open the channel panel (the "Open channels list" key remap). */
  | { kind: 'OpenPanel' }
  /** Show a sticky overlay (sheet, picker, pushed screen); cancels any auto-hide. */
  | { kind: 'Show'; overlay: PlaybackOverlay }
  /** D-pad browsing inside a transient overlay restarts its auto-hide countdown. */
  | { kind: 'KeepAlive' };

export const SHOW_INFO: PlaybackCommand = { kind: 'ShowInfo' };
export const SHOW_TRANSPORT: PlaybackCommand = { kind: 'ShowTransport' };
export const PIN_TRANSPORT: PlaybackCommand = { kind: 'PinTransport' };
export const EXIT_TO_GUIDE: PlaybackCommand = { kind: 'ExitToGuide' };
export const OPEN_QUICK_BAR: PlaybackCommand = { kind: 'OpenQuickBar' };
export const DISMISS: PlaybackCommand = { kind: 'Dismiss' };
export const BACK_TO_PANEL: PlaybackCommand = { kind: 'BackToPanel' };
export const OPEN_PANEL: PlaybackCommand = { kind: 'OpenPanel' };
export const KEEP_ALIVE: PlaybackCommand = { kind: 'KeepAlive' };
export const zap = (delta: number): PlaybackCommand => ({ kind: 'Zap', delta });
export const show = (overlay: PlaybackOverlay): PlaybackCommand => ({ kind: 'Show', overlay });
export const popTo = (overlay: PlaybackOverlay): PlaybackCommand => ({ kind: 'PopTo', overlay });

/** The executor's outward seams (nav + clock re-seed + Appearance timeouts). */
export interface PlaybackCommandSeams {
  /** Re-seeds the overlay's "now" instant. */
  refreshInstant: () => void;
  exitToGuide: () => void;
  timeouts: () => PanelTimeouts;
}

export const DEFAULT_SEAMS: PlaybackCommandSeams = {
  refreshInstant: () => undefined,
  exitToGuide: () => undefined,
  timeouts: () => DEFAULT_PANEL_TIMEOUTS,
};

/**
 * Executes `PlaybackCommand`s against the tuner and overlay state — the ONE
 * writer of `OverlayState` (Android `PlaybackCommands`): the menu handler,
 * track pickers and PIP all express their overlay moves as commands.
 */
export class PlaybackCommands {
  constructor(
    private readonly tuner: Pick<TuneController, 'zap'>,
    private readonly overlays: OverlayState,
    private readonly seams: PlaybackCommandSeams = DEFAULT_SEAMS,
  ) {}

  get overlay(): PlaybackOverlay {
    return this.overlays.value;
  }

  execute(command: PlaybackCommand): void {
    switch (command.kind) {
      case 'ShowInfo':
        return this.showInfo();
      case 'ShowTransport':
        return this.overlays.showAutoHiding(INFO_TRANSPORT, this.seams.timeouts().infoMs);
      case 'PinTransport':
        return this.overlays.set(INFO_TRANSPORT);
      case 'ExitToGuide':
        return this.seams.exitToGuide();
      case 'Zap':
        return this.zap(command.delta);
      case 'OpenQuickBar':
        return this.overlays.showAutoHiding(QUICK_BAR, this.seams.timeouts().quickBarMs);
      case 'OpenPanel':
        return this.openPanel();
      case 'Dismiss':
        return this.overlays.set(NONE);
      case 'BackToPanel':
        return this.overlays.set(PANEL);
      case 'PopTo':
      case 'Show':
        return this.overlays.set(command.overlay);
      case 'KeepAlive':
        return this.overlays.keepAlive();
    }
  }

  /** The quick-bar's Channels list opens the panel (it focuses the tuned row itself). */
  openPanel(): void {
    this.overlays.set(PANEL);
  }

  /** Zap keeps the old frame on screen; the compact overlay identifies the target. */
  showZapInfo(): void {
    this.seams.refreshInstant();
    this.overlays.showAutoHiding(ZAP_INFO, this.seams.timeouts().zapMs);
  }

  private showInfo(): void {
    this.seams.refreshInstant();
    this.overlays.showAutoHiding(INFO, this.seams.timeouts().infoMs);
  }

  private zap(delta: number): void {
    if (this.tuner.zap(delta)) this.showZapInfo();
  }
}
