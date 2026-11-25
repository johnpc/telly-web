// Owns the transport lifecycle for the engine: resolve the right library for
// a url, tear down the previous one, load. Every `tune`/`cancel` bumps a
// sequence number checked after each await, so a zap mid-import or a
// `stop()` while the manifest loads can never bind a stale library to the
// element (the async twin of the reconnector's epoch).
import type { LoadOptions } from '../engine/PlayerEngine';
import type { Transport, TransportListener } from './transport';

export type TransportFactory = (url: string) => Promise<Transport>;

export class StreamTuner {
  private transport: Transport | null = null;
  private seq = 0;

  constructor(private readonly transportFor: TransportFactory) {}

  /** The transport bound right now, or null between streams. */
  get current(): Transport | null {
    return this.transport;
  }

  /**
   * Loads `url` into `video`; resolves true when the stream is bound and
   * still wanted, false when a later tune/cancel superseded it. Rejects with
   * the library's setup error (import failure, unsupported source).
   */
  async tune(
    video: HTMLVideoElement,
    url: string,
    options: LoadOptions,
    listener: TransportListener,
  ): Promise<boolean> {
    const seq = this.cancel();
    const transport = await this.transportFor(url);
    if (seq !== this.seq) return false;
    this.transport = transport;
    await transport.load(video, url, options, listener);
    return seq === this.seq;
  }

  /** Stops the current transport and retires any in-flight tune. */
  cancel(): number {
    this.seq += 1;
    this.transport?.stop();
    this.transport = null;
    return this.seq;
  }
}
