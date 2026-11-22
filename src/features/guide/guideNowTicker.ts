const MINUTE_MS = 60_000;

/** Milliseconds until the next wall-clock minute boundary. */
export function msToNextMinute(nowMs: number): number {
  return MINUTE_MS - (nowMs % MINUTE_MS);
}

/** Fires `tick` on every minute boundary; returns the stop function. */
function startMinuteTimer(tick: () => void, now: () => number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const arm = (): void => {
    timer = setTimeout(fire, msToNextMinute(now()));
  };
  const fire = (): void => {
    tick();
    arm();
  };
  arm();
  return () => clearTimeout(timer);
}

/**
 * Re-samples `now` on every minute boundary (the reference header clock
 * ticks per minute) and whenever the document becomes visible again
 * (Android `GuideNow` + the lifecycle re-seed). Returns the stop function.
 */
export function startMinuteTicker(
  onTick: (nowMs: number) => void,
  now: () => number,
  target: Document,
): () => void {
  const sample = (): void => onTick(now());
  const stopTimer = startMinuteTimer(sample, now);
  const onVisible = (): void => {
    if (target.visibilityState === 'visible') sample();
  };
  target.addEventListener('visibilitychange', onVisible);
  return () => {
    stopTimer();
    target.removeEventListener('visibilitychange', onVisible);
  };
}
