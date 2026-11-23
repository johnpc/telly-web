import type { ChannelRow } from '@/core/db/types';

/** One playable already-aired programme, resolved to its catch-up URL. */
export interface CatchupRequest {
  channel: ChannelRow;
  url: string;
  title: string | null;
  startMs: number;
  endMs: number;
}

export function durationOf(request: Pick<CatchupRequest, 'startMs' | 'endMs'>): number {
  return request.endMs - request.startMs;
}

/**
 * Web deviation inside the `Catch-up mode` row: a seek issued before the
 * archive's media is attached is lost (the `<video>` has no pipeline yet and
 * the engine starts at 0), so it is latched IN the mode and replayed once the
 * engine reports Playing; leaving the mode drops it by construction.
 */
export type CatchupSeek = { kind: 'None' } | { kind: 'Pending'; positionMs: number };

export const NO_SEEK: CatchupSeek = { kind: 'None' };

/** The catch-up programme the player is on, how it was entered, and a seek awaiting the media. */
export interface CatchupState {
  request: CatchupRequest;
  fromLive: boolean;
  seek: CatchupSeek;
}

/**
 * One-shot hand-off slot between the guide (which resolves a past cell to a
 * catch-up request and pushes the playback route) and the playback screen
 * (which consumes the request instead of tuning the live stream): Empty ·
 * Pending(request). A request nobody consumes waits for the next screen
 * that does (Android `CatchupSession`).
 */
// @stateMachine('Catch-up hand-off')
export class CatchupSession {
  private pending: CatchupRequest | null = null;

  set(request: CatchupRequest): void {
    this.pending = request;
  }

  /** Hands the pending request over exactly once. */
  consume(): CatchupRequest | null {
    const request = this.pending;
    this.pending = null;
    return request;
  }
}

/** The app's one session slot (the guide producer and the playback consumer share it). */
export const catchupSession = new CatchupSession();
