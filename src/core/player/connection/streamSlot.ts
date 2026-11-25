// The engine's seat in the `Provider stream limit` registry: ONE registered
// stream per engine, (re)opened when a tune binds and closed with how it
// ended. Liveness follows the transport's own `isLivePipe` rule — the tune
// says live AND the probe the transport just ran (left in `probeMemo`) saw
// no length — so a finite file labelled live (a fixture clip, an archive
// served as a channel) never counts as a stream the provider could refuse.
import type { LoadOptions } from '../engine/PlayerEngine';
import { recallProbe } from '../probe/probeMemo';
import {
  type StreamConcurrency,
  type StreamEnd,
  type StreamHandle,
  streamConcurrency,
} from './streamConcurrency';

export class StreamSlot {
  private handle: StreamHandle | null = null;

  constructor(private readonly registry: StreamConcurrency = streamConcurrency) {}

  /** A live tune that would be a second stream on a host known to be Limited: refuse before connecting. */
  refuses(url: string, options: LoadOptions): boolean {
    return options.live && this.registry.wouldExceed(url);
  }

  /** The tune bound: this engine's stream is open from now (whatever it held before is Closed). */
  open(url: string, options: LoadOptions): void {
    this.close('Closed');
    const length = recallProbe(url)?.contentLength ?? null;
    this.handle = this.registry.open(url, options.live && length === null);
  }

  /** Ends the held stream; true when this end proved the one-stream limit. */
  close(end: StreamEnd): boolean {
    const handle = this.handle;
    this.handle = null;
    return handle?.close(end) ?? false;
  }
}
