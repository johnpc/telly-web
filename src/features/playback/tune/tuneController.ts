import type { ChannelRow } from '@/core/db/types';
import type { KeyValueStore } from '@/core/kv/keyValueStore';
import type { PlayerEngine } from '@/core/player';
import { ChannelZapper } from './channelZapper';
import { PendingCatchup } from './pendingCatchup';
import { type TunePolicies, defaultTunePolicies } from './tunePolicies';
import { TunedStreamState, type TunedStream } from './tunedStream';

export const LAST_CHANNEL_KEY = 'lastChannelId';

export interface TuneOptions {
  /** Restore paths (cold start, guide resume) pass false so start never bounces to another app. */
  allowExternal?: boolean;
  /** An already-aired programme's archive URL plays instead of the live stream. */
  catchupUrl?: string | null;
}

export interface TuneControllerDeps {
  engine: PlayerEngine;
  store: KeyValueStore;
  /** Live, visible channels in "All channels" order (the controller is fed by the caller's live query). */
  recordWatch: (channel: ChannelRow) => Promise<void>;
  policies?: Partial<TunePolicies>;
  /** App-wide tuned mode (one stream plays for the guide preview AND fullscreen); defaults to a private one. */
  state?: TunedStreamState;
  pendingCatchup?: PendingCatchup;
}

/**
 * Owns which channel is tuned: restores the last-watched channel on start,
 * pushes streams into the engine, persists the last channel id plus a
 * watch-history event, and zaps with wrap-around (Android `TuneController.kt`).
 */
export class TuneController {
  private readonly tuned: TunedStreamState;
  private readonly pendingCatchup: PendingCatchup;
  private readonly policies: TunePolicies;
  private list: ChannelRow[] = [];

  constructor(private readonly deps: TuneControllerDeps) {
    this.policies = defaultTunePolicies(deps.policies);
    this.tuned = deps.state ?? new TunedStreamState();
    this.pendingCatchup = deps.pendingCatchup ?? new PendingCatchup();
  }

  get channels(): readonly ChannelRow[] {
    return this.list;
  }

  get playing(): TunedStream | null {
    return this.tuned.playing;
  }

  get current(): ChannelRow | null {
    return this.tuned.current;
  }

  subscribe(listener: () => void): () => void {
    return this.tuned.subscribe(listener);
  }

  /** The caller's live query feeds the channel list; a tuned channel that vanished is zapped away from. */
  setChannels(channels: readonly ChannelRow[]): void {
    this.list = [...channels];
  }

  /** Tunes the last-watched channel (or the first) when nothing is tuned yet. */
  start(): void {
    if (this.current !== null) return;
    const restored = ChannelZapper.restore(this.list, this.storedId());
    if (restored !== null) this.tune(restored, { allowExternal: false });
  }

  /** Re-tunes the stored last-watched channel for the guide preview; a never-set id resumes nothing. */
  resumeStored(): void {
    const storedId = this.storedId();
    if (storedId === null) return;
    const restored = ChannelZapper.restore(this.list, storedId);
    if (restored !== null) this.tune(restored, { allowExternal: false });
  }

  tune(channel: ChannelRow, options: TuneOptions = {}): void {
    const catchupUrl = options.catchupUrl ?? null;
    if (this.policies.gate.intercept(channel)) return this.pendingCatchup.stash(channel.id, catchupUrl);
    const archiveUrl = this.pendingCatchup.consume(channel.id, catchupUrl);
    this.deps.store.set(LAST_CHANNEL_KEY, String(channel.id));
    if (archiveUrl !== null) return this.playArchive(channel, archiveUrl);
    void this.deps.recordWatch(channel);
    this.playLive(channel, options.allowExternal ?? true);
  }

  private playArchive(channel: ChannelRow, url: string): void {
    this.tuned.publish({ kind: 'Archive', channel, url });
    this.deps.engine.load(this.policies.resolveUrl(url), { live: false });
  }

  private playLive(channel: ChannelRow, allowExternal: boolean): void {
    const liveUrl = this.policies.resolveUrl(channel.streamUrl);
    if (allowExternal && this.policies.external.handsOff(channel, liveUrl)) {
      this.tuned.publish({ kind: 'External', channel });
      return this.deps.engine.stop();
    }
    this.tuned.publish({ kind: 'Live', channel });
    this.deps.engine.load(liveUrl, { live: true });
  }

  /** Re-loads the current channel's live stream (after a background stop). */
  retune(): void {
    const channel = this.current;
    if (channel !== null) this.deps.engine.load(this.policies.resolveUrl(channel.streamUrl), { live: true });
  }

  /** Tunes the channel `delta` steps away (wraps); false when impossible or PIN-gated. */
  zap(delta: number): boolean {
    const next = ChannelZapper.neighbour(this.list, this.current, delta);
    if (next === null) return false;
    this.tune(next);
    return this.current?.id === next.id;
  }

  byId = (channelId: number): ChannelRow | null => this.list.find((c) => c.id === channelId) ?? null;

  /** Retunes to the next channel when `channel` is about to disappear. */
  zapAwayFrom(channel: ChannelRow): void {
    if (channel.id !== this.current?.id) return;
    const next = ChannelZapper.neighbour(this.list, channel, +1);
    if (next !== null && next.id !== channel.id) this.tune(next);
  }

  private storedId(): number | null {
    const raw = this.deps.store.get(LAST_CHANNEL_KEY);
    return raw === null ? null : Number(raw);
  }
}
