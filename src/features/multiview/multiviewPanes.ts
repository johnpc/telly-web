import type { ChannelRow } from '@/core/db/types';
import type { PlayerEngine } from '@/core/player';
import { applyResizeMode } from '@/features/playback/resizeModeSetting';
import { MAX_PANES } from './multiviewGrid';

/** The pane that takes focus after a removal at `index`: the one now at that slot, else the last. */
function neighbourId(remaining: readonly MultiviewPane[], index: number): number {
  return (remaining[index] ?? remaining[remaining.length - 1])?.id ?? 0;
}

/** One multiview pane: a channel playing on its OWN engine (never the shared live lease). */
export interface MultiviewPane {
  id: number;
  channel: ChannelRow;
  engine: PlayerEngine;
}

/**
 * The pane list and its audio ownership (Android `MultiviewPanes`): the
 * FOCUSED pane is the only unmuted engine, adding focuses the new pane,
 * removing collapses the grid onto a neighbour, and `change` retunes the
 * focused pane in place. Every engine comes from `engines()` and is released
 * by `releaseAll` on exit.
 */
export class MultiviewPanes {
  private list: readonly MultiviewPane[] = [];
  private focusedPaneId = 0;
  private nextId = 1;
  private resizeRaw = 'Fit';
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly engines: () => PlayerEngine,
    private readonly resolveUrl: (url: string) => string = (url) => url,
  ) {}

  get panes(): readonly MultiviewPane[] {
    return this.list;
  }

  get focusedId(): number {
    return this.focusedPaneId;
  }

  get focused(): MultiviewPane | null {
    return this.list.find((pane) => pane.id === this.focusedPaneId) ?? null;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Adds a pane playing `channel` (capped at `MAX_PANES`) and focuses it. */
  add(channel: ChannelRow): boolean {
    if (this.list.length >= MAX_PANES) return false;
    const engine = this.engines();
    applyResizeMode(engine, this.resizeRaw);
    const pane: MultiviewPane = { id: this.nextId, channel, engine };
    this.nextId += 1;
    engine.load(this.resolveUrl(channel.streamUrl), { live: true });
    this.list = [...this.list, pane];
    this.focus(pane.id);
    return true;
  }

  /** Change channel: the focused pane retunes in place. */
  change(channel: ChannelRow): void {
    const pane = this.focused;
    if (pane === null) return;
    pane.engine.load(this.resolveUrl(channel.streamUrl), { live: true });
    this.list = this.list.map((p) => (p.id === pane.id ? { ...p, channel } : p));
    this.notify();
  }

  /** Removes the focused pane (never the last); focus falls to a neighbour. */
  removeFocused(): boolean {
    const pane = this.focused;
    if (pane === null || this.list.length <= 1) return false;
    const index = this.list.indexOf(pane);
    pane.engine.release();
    this.list = this.list.filter((p) => p.id !== pane.id);
    this.focus(neighbourId(this.list, index));
    return true;
  }

  /** D-pad focus between panes; the focused pane owns audio, the others mute. */
  focus(paneId: number): void {
    if (!this.list.some((pane) => pane.id === paneId)) return;
    this.focusedPaneId = paneId;
    for (const pane of this.list) pane.engine.muted = pane.id !== paneId;
    this.notify();
  }

  /** Settings → Playback → Resize mode, honoured by every pane like fullscreen playback. */
  setResizeMode(raw: string): void {
    this.resizeRaw = raw;
    for (const pane of this.list) applyResizeMode(pane.engine, raw);
  }

  /** Exit: every pane's decoder is released. */
  releaseAll(): void {
    for (const pane of this.list) pane.engine.release();
    this.list = [];
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
