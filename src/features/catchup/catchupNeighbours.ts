import type { ChannelRow, ProgramRow } from '@/core/db/types';
import type { CatchupEpg } from './catchupEpg';
import { archiveRequest, requestOf } from './catchupRequest';
import type { CatchupRequest } from './catchupSession';

/** Where a transport ⏮/⏭ hop lands. */
export type CatchupJump =
  | { kind: 'Archive'; request: CatchupRequest }
  /** Past the newest archive (or off the EPG edge): back to live. */
  | { kind: 'Live' };

export const LIVE_JUMP: CatchupJump = { kind: 'Live' };

/** Neighbour lookup window; programmes are at most 90 min in practice. */
export const SCAN_MS = 6 * 3_600_000;

/**
 * Resolves the EPG neighbours of an archived programme for the transport's
 * ⏮/⏭ buttons (Android `CatchupNeighbours`): previous = the newest
 * programme ending at or before the archive's start, next = the oldest one
 * starting at or after its end. Only fully-aired programmes inside the
 * catchup-days horizon build an archive; anything newer (the airing
 * programme, an EPG edge) is the Live jump.
 */
export class CatchupNeighbours {
  constructor(
    private readonly epg: CatchupEpg,
    private readonly clock: () => number,
  ) {}

  /** The playable previous programme's request, or null (= stay put). */
  async previous(request: CatchupRequest): Promise<CatchupRequest | null> {
    const rows = await this.epg.programmesFor(request.channel, request.startMs - SCAN_MS, request.startMs);
    const neighbour = newest(rows.filter((p) => p.endMs <= request.startMs));
    return neighbour === null ? null : archiveRequest(request.channel, neighbour, this.clock());
  }

  /** The next programme's archive, or the Live jump at the newest end. */
  async next(request: CatchupRequest): Promise<CatchupJump> {
    const rows = await this.epg.programmesFor(request.channel, request.endMs, request.endMs + SCAN_MS);
    const neighbour = oldest(rows.filter((p) => p.startMs >= request.endMs));
    const now = this.clock();
    if (neighbour === null || neighbour.endMs > now) return LIVE_JUMP;
    const archive = archiveRequest(request.channel, neighbour, now);
    return archive === null ? LIVE_JUMP : { kind: 'Archive', request: archive };
  }
}

function newest(rows: readonly ProgramRow[]): ProgramRow | null {
  return rows.reduce<ProgramRow | null>(
    (best, p) => (best === null || p.startMs > best.startMs ? p : best),
    null,
  );
}

function oldest(rows: readonly ProgramRow[]): ProgramRow | null {
  return rows.reduce<ProgramRow | null>(
    (best, p) => (best === null || p.startMs < best.startMs ? p : best),
    null,
  );
}

/**
 * Resolves "rewind live into catch-up" (the RW/Left/Down-rewinds-live
 * toggles): the airing programme of the tuned catch-up channel, built into
 * a request whose stream starts at the programme start — the caller then
 * seeks to live edge minus the skip step (Android `CatchupLiveEdge`).
 */
export async function liveEdgeRequest(
  epg: CatchupEpg,
  channel: ChannelRow,
  nowMs: number,
): Promise<CatchupRequest | null> {
  const airing = await epg.airingAt(channel, nowMs);
  return airing === null ? null : requestOf(channel, airing.startMs, airing.endMs, airing, nowMs);
}
