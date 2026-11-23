import type { ChannelRow } from '@/core/db/types';
import type { CatchupEpg } from './catchupEpg';
import { type CatchupNeighbours, liveEdgeRequest } from './catchupNeighbours';
import type { CatchupRequest, CatchupState } from './catchupSession';

/** The playback mode's surface a jump drives. */
export interface HopHost {
  active(): CatchupState | null;
  enter(request: CatchupRequest, fromLive: boolean): void;
  toLive(): void;
  seek(positionMs: number): void;
}

/**
 * Programme jumps during catch-up (Android `CatchupProgrammeHop`): the
 * transport's ⏮/⏭ hop to the neighbouring programme's archive on the same
 * channel (⏭ past the newest archive returns to live), and the rewind-live
 * entry into the airing programme's archive near the live edge. A hop keeps
 * the entry origin, so BACK still returns where catch-up was entered from.
 */
export class CatchupProgrammeHop {
  constructor(
    private readonly neighbours: CatchupNeighbours,
    private readonly epg: CatchupEpg,
    private readonly host: HopHost,
  ) {}

  /** ⏮: the previous programme's archive; outside the horizon = stay put. */
  async previous(): Promise<void> {
    const current = this.host.active();
    if (current === null) return;
    const request = await this.neighbours.previous(current.request);
    if (request !== null) this.host.enter(request, current.fromLive);
  }

  /** ⏭: the next programme's archive; at the newest end back to live. */
  async next(): Promise<void> {
    const current = this.host.active();
    if (current === null) return;
    const jump = await this.neighbours.next(current.request);
    if (jump.kind === 'Archive') this.host.enter(jump.request, current.fromLive);
    else this.host.toLive();
  }

  /** RW-rewinds-live: the airing programme's archive at live edge − skip. */
  async rewindFromLive(channel: ChannelRow | null, deltaMs: number, nowMs: number): Promise<void> {
    if (channel === null) return;
    const request = await liveEdgeRequest(this.epg, channel, nowMs);
    if (request === null) return;
    this.host.enter(request, true);
    this.host.seek(Math.max(0, nowMs - deltaMs - request.startMs));
  }
}
