import type { ChannelRow } from '@/core/db/types';
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import { ChannelZapper, LAST_CHANNEL_KEY } from '@/features/playback/tune';
import { MAX_PANES } from './multiviewGrid';
import {
  MENU,
  PANES,
  menuRows,
  picker,
  type MultiviewLayer,
  type MultiviewMenuAction,
} from './multiviewLayer';
import type { MultiviewPanes } from './multiviewPanes';
import type { MultiviewTuneGate } from './multiviewTuneGate';

export interface MultiviewViewModelDeps {
  panes: MultiviewPanes;
  gate: MultiviewTuneGate;
  /** The scalar store (`lastChannelId`): the entry pane reads it, exit writes the focused pane's channel. */
  store: KeyValueStore;
  /** BACK at the pane layer (or a cancelled paneless entry): the host pops the route. */
  onExit: () => void;
}

/**
 * Multiview state machine (Android `MultiviewViewModel`): entry = one centred
 * pane on the current channel, OK on a pane opens its menu, every menu row
 * opens the channel picker, BACK walks picker/menu -> panes -> fullscreen
 * playback of the focused pane's channel. Every tune path passes the
 * blocked-channel PIN gate; a wrong or cancelled PIN never tunes.
 */
export class MultiviewViewModel {
  readonly panes: MultiviewPanes;
  readonly gate: MultiviewTuneGate;
  private layerState: MultiviewLayer = PANES;
  private channels: readonly ChannelRow[] = [];
  private started = false;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly deps: MultiviewViewModelDeps) {
    this.panes = deps.panes;
    this.gate = deps.gate;
  }

  get layer(): MultiviewLayer {
    return this.layerState;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The live, visible channel list (zap order). */
  setChannels(channels: readonly ChannelRow[]): void {
    this.channels = channels;
  }

  /** Entry teaser: one pane playing the current (last-watched) channel, once the list is known. */
  start(): void {
    if (this.started || this.channels.length === 0) return;
    this.started = true;
    const raw = this.deps.store.get(LAST_CHANNEL_KEY);
    const restored = ChannelZapper.restore(this.channels, raw === null ? null : Number(raw));
    if (restored !== null) this.gate.tune(restored, (channel) => this.panes.add(channel));
  }

  /** OK on a pane focuses it and opens its menu. */
  onPaneOk(paneId: number): void {
    this.panes.focus(paneId);
    this.setLayer(MENU);
  }

  menuRows(): MultiviewMenuAction[] {
    return menuRows(this.panes.panes.length, MAX_PANES);
  }

  /** Search and add opens the same picker as Add screen (the reference does exactly that). */
  onMenuAction(action: MultiviewMenuAction): void {
    if (action === 'REMOVE_SCREEN') {
      this.panes.removeFocused();
      return this.setLayer(PANES);
    }
    this.setLayer(picker(action === 'CHANGE_CHANNEL' ? 'CHANGE' : 'ADD'));
  }

  /** Picker OK: Add fills the next pane, Change retunes the focused one (PIN card up = ignored). */
  onPick(channel: ChannelRow): void {
    const layer = this.layerState;
    if (layer.kind !== 'Picker' || this.gate.promptOpen) return;
    this.gate.tune(channel, (unlocked) => {
      if (layer.mode === 'ADD') this.panes.add(unlocked);
      else this.panes.change(unlocked);
      this.setLayer(PANES);
    });
  }

  /** BACK: an open PIN prompt cancels first (a paneless entry exits); then picker/menu -> panes; panes -> fullscreen. */
  onBack(): void {
    if (this.gate.promptOpen) {
      this.gate.dismiss();
      if (this.panes.panes.length === 0) this.deps.onExit();
      return;
    }
    if (this.layerState.kind === 'Panes') return this.exitToFullscreen();
    this.setLayer(PANES);
  }

  /** CH+/- zap the focused pane in place (panes layer only, PIN-gated). */
  onChannelKey(delta: number): void {
    if (this.layerState.kind !== 'Panes' || this.gate.promptOpen) return;
    const next = ChannelZapper.neighbour(this.channels, this.panes.focused?.channel ?? null, delta);
    if (next !== null) this.gate.tune(next, (channel) => this.panes.change(channel));
  }

  /** Unmount: every pane engine is released. */
  close(): void {
    this.panes.releaseAll();
  }

  /** The focused pane's channel becomes the fullscreen channel (no confirm). */
  private exitToFullscreen(): void {
    const channel = this.panes.focused?.channel;
    if (channel !== undefined) this.deps.store.set(LAST_CHANNEL_KEY, String(channel.id));
    this.deps.onExit();
  }

  private setLayer(layer: MultiviewLayer): void {
    this.layerState = layer;
    for (const listener of this.listeners) listener();
  }
}
