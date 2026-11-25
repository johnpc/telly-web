// Construction-time seams of `WebPlayerEngine`: the transport factory plus
// the deferred-work and observation hooks tests replace (Android's
// `EngineSchedulers`). Prod defaults: setTimeout retries, a setInterval
// watchdog, console telemetry under the `telly-play` tag.
import type { BufferThresholds } from '../gate/bufferGate';
import type { Schedule } from '../connection/engineReconnector';
import { PlaybackTelemetry, consoleTelemetryLog } from '../telemetry/playbackTelemetry';
import type { Ticker } from '../connection/stallWatchdog';
import { intervalTicker } from '../connection/stallWatchdog';
import type { ReconnectPolicy } from '../connection/reconnectPolicy';
import type { TransportFactory } from '../transport/streamTuner';

export interface EngineDeps {
  transportFor: TransportFactory;
  /** Reconnect retry scheduler; default setTimeout. */
  schedule?: Schedule;
  /** Stall watchdog ticker; null disables the watchdog (tests opt in). */
  ticker?: Ticker | null;
  /** Health log sink; null silences telemetry. */
  telemetry?: PlaybackTelemetry | null;
  policy?: ReconnectPolicy;
  /** Settings → Playback → Buffer size, read live per tune; default Small. */
  bufferThresholds?: () => BufferThresholds;
}

export const setTimeoutSchedule: Schedule = (ms, task) => {
  setTimeout(task, ms);
};

export function telemetryOf(deps: EngineDeps): PlaybackTelemetry | null {
  if (deps.telemetry !== undefined) return deps.telemetry;
  return new PlaybackTelemetry(() => Date.now(), consoleTelemetryLog);
}

export function tickerOf(deps: EngineDeps): Ticker | null {
  return deps.ticker === undefined ? intervalTicker : deps.ticker;
}

export function scheduleOf(deps: EngineDeps): Schedule {
  return deps.schedule ?? setTimeoutSchedule;
}
