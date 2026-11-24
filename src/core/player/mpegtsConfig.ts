// Pure mpegts.js configuration + mapping, kept out of the transport so it
// tests flat: the live/file decision, the player config, the MEDIA_INFO →
// badge mapping and the error-message shape.
import type Mpegts from 'mpegts.js';
import type { LoadOptions } from './PlayerEngine';
import type { StreamDetails } from './streamDetails';
import type { UrlProbe } from './urlProbe';

/** Live only when the caller says live AND the server streams without a length. */
export function isLivePipe(options: LoadOptions, probe: UrlProbe): boolean {
  return options.live && probe.contentLength === null;
}

/**
 * Worker demux, no lazy-load pause (a file streams like a channel), and NO
 * latency chasing: chasing capped the live buffer at ~3 s and seeked forward
 * whenever more arrived, so a jittery provider stream rebuffered constantly
 * (measured: 11 rebuffers / 60 s). Like Android/TiviMate the stream drifts at
 * 1.0× over a deep buffer; the `BufferGate` adds the start / post-stall
 * runway, and the source buffer is trimmed 30–60 s behind the playhead.
 */
export function mpegtsConfig(isLive: boolean): Mpegts.Config {
  return {
    enableWorker: true,
    lazyLoad: false,
    isLive,
    liveBufferLatencyChasing: false,
    autoCleanupSourceBuffer: true,
    autoCleanupMaxBackwardDuration: 60,
    autoCleanupMinBackwardDuration: 30,
    // A 1 MB IO stash smooths the provider's bursty delivery into fewer, larger MSE appends.
    stashInitialSize: 1024 * 1024,
  };
}

/** `MEDIA_INFO` → the badge facts (fps and channel count come from the codec headers). */
export function detailsOf(info: Mpegts.MSEPlayerMediaInfo): Partial<StreamDetails> {
  const channels: unknown = info['audioChannelCount'];
  return {
    width: info.width ?? 0,
    height: info.height ?? 0,
    frameRate: info.fps ?? 0,
    audioChannels: typeof channels === 'number' ? channels : 0,
  };
}

export interface MpegtsErrorInfo {
  msg?: string;
}

/** `type/detail: msg` — mpegts.js reports errors as three loose arguments. */
export function mpegtsErrorMessage(type: string, detail: string, info?: MpegtsErrorInfo): string {
  const suffix = info?.msg === undefined ? '' : `: ${info.msg}`;
  return `${type}/${detail}${suffix}`;
}
