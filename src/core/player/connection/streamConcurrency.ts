// @stateMachine('Provider stream limit')
//
// ONE owner for a fact the app can only learn by trying: does the provider's
// line carry a single stream? Measured 2026-11-24 on the real provider
// through the relay: with two or three concurrent connections only one
// receives data (19 MB in 8 s); every other gets HTTP 200 with the same
// ~710 KB body — a "too many connections" slate — that then ends. So a second
// multiview pane, or a capture started while watching, plays a short slate,
// Ends, and would loop if the reconnector retried it. Every live stream the
// app opens — engine tunes (`StreamSlot`) and DVR captures (`captureAttempts`)
// — registers here, and asks on its way out whether its end proved the limit.
//
// Rule: a live stream that reaches Ended or Error within SLATE_WINDOW_MS of
// opening while another live stream from the same host is open ⇒
// Limited(host). A second concurrent stream opening arms Suspected plus one
// check after the window: both still open ⇒ Cleared (the host carries two).
// Limited also expires after LIMIT_TTL_MS, read lazily on the next look.
// "Live" is the engine's own `isLivePipe` rule — the app says live AND the
// server streamed without a length — so finite files (catch-up, VOD, the
// fixture clips) never count. Hosts are the PROVIDER's: a proxied URL is
// unwrapped first, so every channel of one line shares its verdict.
import { errorState, type EngineState } from './engineState';
import type { Schedule } from './engineReconnector';

export const STREAM_LIMIT_MESSAGE = 'Your provider allows one stream at a time';
/** The terminal state a limited tune surfaces; no retry is ever armed for it. */
export const STREAM_LIMITED: EngineState = errorState(STREAM_LIMIT_MESSAGE);
/** A slate ends well inside this; a real second stream outlives it. */
export const SLATE_WINDOW_MS = 20_000;
export const LIMIT_TTL_MS = 10 * 60_000;

export type StreamLimit =
  | { kind: 'Unknown' }
  | { kind: 'Suspected'; host: string; since: number }
  | { kind: 'Limited'; host: string; since: number }
  | { kind: 'Cleared' };

/** How a registered stream went away: the user closed it, or it reached the media's end / an error. */
export type StreamEnd = 'Ended' | 'Error' | 'Closed';

export interface StreamHandle {
  /** Unregisters; true when this end proved the one-stream limit (the caller must not retry). */
  close(end: StreamEnd): boolean;
}

interface OpenStream {
  id: number;
  host: string;
  live: boolean;
  openedAt: number;
}

const UNKNOWN: StreamLimit = { kind: 'Unknown' };
const CLEARED: StreamLimit = { kind: 'Cleared' };

export function isStreamLimited(state: EngineState): boolean {
  return state.kind === 'Error' && state.message === STREAM_LIMIT_MESSAGE;
}

function parseHttp(candidate: string, encoded = false): URL | null {
  try {
    const url = new URL(encoded ? decodeURIComponent(candidate) : candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** The provider host behind `url`, unwrapping the Stream & CORS proxy (`…/proxy/?url=<enc>` or `<base><enc>`). */
export function streamHostOf(url: string): string {
  const outer = parseHttp(url);
  if (outer === null) return url;
  const parts = [...outer.searchParams].flat();
  const inner = parts.map((part) => parseHttp(part)).find((parsed) => parsed !== null) ?? tailUrl(outer);
  return (inner ?? outer).host;
}

/** `<base><encodeURIComponent(url)>`: the proxied URL is the outer URL's last path segment. */
function tailUrl(outer: URL): URL | null {
  return parseHttp(outer.pathname.split('/').pop() ?? '', true);
}

export class StreamConcurrency {
  private current: StreamLimit = UNKNOWN;
  private readonly streams = new Map<number, OpenStream>();
  private nextId = 1;

  constructor(
    private readonly clock: () => number = () => Date.now(),
    private readonly schedule: Schedule = (ms, task) => void setTimeout(task, ms),
  ) {}

  /** The verdict so far; a Limited older than LIMIT_TTL_MS reads as Cleared. */
  get state(): StreamLimit {
    const state = this.current;
    if (state.kind === 'Limited' && this.clock() - state.since >= LIMIT_TTL_MS) this.current = CLEARED;
    return this.current;
  }

  /** True when a live stream from `url`'s host would be a second one on a host known to be Limited. */
  wouldExceed(url: string): boolean {
    const state = this.state;
    return (
      state.kind === 'Limited' && state.host === streamHostOf(url) && this.openLive(state.host, null) > 0
    );
  }

  /** Registers a stream the app is opening now; `live` per the `isLivePipe` rule. */
  open(url: string, live: boolean): StreamHandle {
    const stream: OpenStream = { id: this.nextId, host: streamHostOf(url), live, openedAt: this.clock() };
    this.nextId += 1;
    this.streams.set(stream.id, stream);
    if (live && this.openLive(stream.host, stream.id) > 0) this.watch(stream);
    return { close: (end) => this.close(stream, end) };
  }

  /** Live streams open from `host`, not counting `except`. */
  private openLive(host: string, except: number | null): number {
    return [...this.streams.values()].filter((s) => s.live && s.host === host && s.id !== except).length;
  }

  /** A second concurrent stream: suspect the host, and clear it when both outlive the slate window. */
  private watch(stream: OpenStream): void {
    const { host } = stream;
    if (this.state.kind !== 'Limited') this.current = { kind: 'Suspected', host, since: stream.openedAt };
    this.schedule(SLATE_WINDOW_MS, () => {
      const limitedElsewhere = this.current.kind === 'Limited' && this.current.host !== host;
      if (!limitedElsewhere && this.streams.has(stream.id) && this.openLive(host, stream.id) > 0) {
        this.current = CLEARED;
      }
    });
  }

  private close(stream: OpenStream, end: StreamEnd): boolean {
    if (!this.streams.delete(stream.id)) return false;
    const siblings = this.openLive(stream.host, null);
    const slate = stream.live && end !== 'Closed' && this.clock() - stream.openedAt < SLATE_WINDOW_MS;
    if (slate && siblings > 0) {
      this.current = { kind: 'Limited', host: stream.host, since: this.clock() };
      return true;
    }
    if (this.current.kind === 'Suspected' && this.current.host === stream.host && siblings < 2) {
      this.current = UNKNOWN;
    }
    return false;
  }
}

/** The app's one registry: every engine and every capture shares the verdict. */
export const streamConcurrency = new StreamConcurrency();
