// The one `<video>` node an engine drives. It is created ONCE per engine and
// re-parented between hosts (guide preview → fullscreen) so the stream never
// re-tunes on a route change; React never renders it (see `VideoSurface`).
// `data-testid` / `data-state` let Playwright wait on real playback state.
// The host lays the element and the zap frame-hold canvas over each other
// as grid items in one cell (`grid-area: 1 / 1`), so the frame of the
// previous channel stays up while the next one builds its runway.

export const VIDEO_TESTID = 'video-surface';

export interface BufferedRange {
  startMs: number;
  endMs: number;
}

export function createVideoElement(doc: Document = document): HTMLVideoElement {
  const video = doc.createElement('video');
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.autoplay = true;
  video.muted = false;
  video.controls = false;
  video.preload = 'auto';
  video.dataset.testid = VIDEO_TESTID;
  video.dataset.state = 'Idle';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.minWidth = '0';
  video.style.minHeight = '0';
  video.style.gridArea = '1 / 1';
  video.style.objectFit = 'contain';
  video.style.backgroundColor = 'black';
  return video;
}

/** Appends `video` to `container` unless it already lives there. */
/**
 * Re-parents the ONE `<video>` into `container`. A media element that leaves the
 * document pauses itself (HTML spec), so a stream that was playing is resumed
 * once it is back in the tree — the guide ↔ fullscreen hand-over must not stall.
 */
export function moveVideoTo(video: HTMLVideoElement, container: Element): void {
  if (video.parentElement === container) return;
  const wasPlaying = !video.paused && !video.ended;
  container.appendChild(video);
  if (wasPlaying || video.paused) resumeIfLive(video);
}

function resumeIfLive(video: HTMLVideoElement): void {
  if (video.readyState > 0 && video.currentSrc !== '') safePlay(video);
}

/** `play()` rejects on autoplay policy; the engine surfaces that via events, not exceptions. */
export function safePlay(video: HTMLVideoElement): void {
  try {
    const result: unknown = video.play();
    if (result instanceof Promise) result.catch(() => undefined);
  } catch {
    // jsdom and ancient engines throw synchronously; nothing to do.
  }
}

export function positionMsOf(video: HTMLVideoElement): number {
  return Math.round(video.currentTime * 1000);
}

/** Infinity for live MSE streams, 0 while unknown (NaN). */
export function durationMsOf(video: HTMLVideoElement): number {
  const seconds = video.duration;
  if (Number.isNaN(seconds)) return 0;
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : Number.POSITIVE_INFINITY;
}

export function bufferedRangesOf(video: HTMLVideoElement): BufferedRange[] {
  const ranges = video.buffered;
  const out: BufferedRange[] = [];
  for (let i = 0; i < ranges.length; i += 1) {
    out.push({ startMs: Math.round(ranges.start(i) * 1000), endMs: Math.round(ranges.end(i) * 1000) });
  }
  return out;
}

/** Milliseconds buffered ahead of the playhead (telemetry's "N ms buffered"). */
export function bufferedAheadMsOf(video: HTMLVideoElement): number {
  const position = positionMsOf(video);
  const ahead = bufferedRangesOf(video).find((r) => r.startMs <= position && r.endMs >= position);
  return ahead === undefined ? 0 : ahead.endMs - position;
}

/** `getVideoPlaybackQuality()` where implemented (not jsdom, not every TV browser). */
export function playbackQualityOf(video: HTMLVideoElement): VideoPlaybackQuality | null {
  return typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null;
}
