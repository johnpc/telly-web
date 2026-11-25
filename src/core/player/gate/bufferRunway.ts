// The measurements behind the buffer gate: how much media is buffered past
// the playhead, whether a finite file is already buffered to its end, and the
// runway each Settings → Playback → Buffer size asks for.
//
// ONE runway, built before the first frame and again after an underrun.
// Android's `PlayerTuning` has a shorter start runway, and so did this gate
// until 2026-11-23: measured on a real provider through the TLS relay, a
// cold line sends a ~2 s pre-roll burst and then trickles at ~1× realtime,
// so a short start runway reads as "bursting", plays, and stalls for the long
// runway two seconds later; a 1× pipe cannot build runway while playing, and a
// pipe that truly bursts fills the long runway in under two seconds anyway.

export interface BufferThresholds {
  /** Seconds buffered ahead before the first frame plays and before playback resumes after a stall. */
  runwaySec: number;
}

const THRESHOLDS: Readonly<Record<string, BufferThresholds>> = {
  Small: { runwaySec: 6 },
  Medium: { runwaySec: 8 },
  Large: { runwaySec: 12 },
};

export function thresholdsFor(bufferSize: string): BufferThresholds {
  return THRESHOLDS[bufferSize] ?? THRESHOLDS['Small'] ?? { runwaySec: 6 };
}

/** Seconds of media buffered beyond the playhead. */
export function bufferedAhead(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  for (let i = buffered.length - 1; i >= 0; i -= 1) {
    if (buffered.start(i) <= currentTime + 0.25) return Math.max(0, buffered.end(i) - currentTime);
  }
  return 0;
}

/** A finite file whose buffer reaches its end has all the runway there is (the archive must be allowed to finish). */
export function bufferedToEnd(video: HTMLVideoElement): boolean {
  const { duration, buffered } = video;
  if (!Number.isFinite(duration) || buffered.length === 0) return false;
  return buffered.end(buffered.length - 1) >= duration - 0.3;
}

/** True once the element may (re)start: the runway is there, or the file has no more to give. */
export function runwayReady(video: HTMLVideoElement, thresholds: BufferThresholds): boolean {
  return bufferedAhead(video) >= thresholds.runwaySec || bufferedToEnd(video);
}
