// Binds one `<video>` to the engine's observers: media events → connection
// state, telemetry analytics, the frame feed and the stall watchdog. Returns
// the single unwire function `release()` calls, so nothing outlives the
// element (multiview pane engines must not leak tickers).
import type { EngineState } from './engineState';
import { StallDetector } from './stallDetector';
import { StallWatchdog, sampleOf, type Ticker } from './stallWatchdog';
import type { TelemetryAnalytics } from './telemetryAnalytics';
import { bindVideoEvents, type VideoEventHandlers } from './videoEvents';
import type { VideoFeed } from './videoFeed';

export interface Wiring extends VideoEventHandlers {
  stateOf: () => EngineState;
  onStall: () => void;
  analytics: TelemetryAnalytics | null;
  feed: VideoFeed;
  /** null = no watchdog (tests opt in). */
  ticker: Ticker | null;
}

export function wireVideo(video: HTMLVideoElement, wiring: Wiring): () => void {
  const unbind = bindVideoEvents(video, wiring);
  wiring.analytics?.bind(video);
  wiring.feed.attach(video);
  const watchdog = wiring.ticker === null ? null : startWatchdog(video, wiring, wiring.ticker);
  return () => {
    watchdog?.stop();
    unbind();
    wiring.analytics?.unbind();
    wiring.feed.detach();
  };
}

function startWatchdog(video: HTMLVideoElement, wiring: Wiring, ticker: Ticker): StallWatchdog {
  const watchdog = new StallWatchdog(
    new StallDetector(),
    ticker,
    () => sampleOf(video, wiring.stateOf()),
    wiring.onStall,
    () => wiring.analytics?.sample(),
  );
  watchdog.start();
  return watchdog;
}
