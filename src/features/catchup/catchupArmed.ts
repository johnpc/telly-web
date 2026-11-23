import type { TunedStream } from '@/features/playback/tune';
import type { CatchupState } from './catchupSession';

/** Catch-up is on exactly while the tuner plays the archive this mode armed. */
export function activeFor(stream: TunedStream | null, armed: CatchupState | null): CatchupState | null {
  if (armed === null || stream === null || stream.kind !== 'Archive') return null;
  return stream.url === armed.request.url ? armed : null;
}

interface Memo {
  stream: TunedStream | null;
  armed: CatchupState | null;
  state: CatchupState | null;
}

/**
 * The archive the mode asked the tuner to play (null = not asked), and the
 * DERIVED active state against the tuner's stream — memoised per input pair
 * so React's external-store reads get a stable snapshot.
 */
export class ArmedArchive {
  private armed: CatchupState | null = null;
  private memo: Memo = { stream: null, armed: null, state: null };
  private readonly listeners = new Set<() => void>();

  /** The armed archive while `stream` is actually playing it. */
  activeIn(stream: TunedStream | null): CatchupState | null {
    if (!this.fresh(stream)) this.memo = this.remember(stream);
    return this.memo.state;
  }

  arm(next: CatchupState | null): void {
    this.armed = next;
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private fresh(stream: TunedStream | null): boolean {
    return this.memo.stream === stream && this.memo.armed === this.armed;
  }

  private remember(stream: TunedStream | null): Memo {
    const { armed } = this;
    return { stream, armed, state: activeFor(stream, armed) };
  }
}
