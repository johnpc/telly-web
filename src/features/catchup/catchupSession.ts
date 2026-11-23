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

/** The catch-up programme the player is on, and how it was entered. */
export interface CatchupState {
  request: CatchupRequest;
  fromLive: boolean;
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
