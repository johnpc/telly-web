// @stateMachine('VOD playback')
//
// Where VOD playback is: loading the item, the Resume/Start-over prompt, or
// playing (Android `VodStage`). ONE discriminated union, written only by
// `VodPlaybackViewModel`.

export type VodStage =
  | { kind: 'Loading' }
  /** A stored position inside the resume band: offer Resume/Start over. */
  | { kind: 'ResumePrompt'; positionMs: number }
  | { kind: 'Playing' };

export const VOD_LOADING: VodStage = { kind: 'Loading' };
export const VOD_PLAYING: VodStage = { kind: 'Playing' };

export function resumePrompt(positionMs: number): VodStage {
  return { kind: 'ResumePrompt', positionMs };
}

/** The transport's clock sample: current position and known duration. */
export interface VodProgress {
  positionMs: number;
  durationMs: number;
}

export const NO_PROGRESS: VodProgress = { positionMs: 0, durationMs: 0 };

export function sameProgress(a: VodProgress, b: VodProgress): boolean {
  return a.positionMs === b.positionMs && a.durationMs === b.durationMs;
}

const PERMILLE = 1000;

/** Unclamped thousandths watched; -1 while the duration is unknown. */
export function rawPermille(positionMs: number, durationMs: number): number {
  return durationMs <= 0 ? -1 : Math.floor((positionMs * PERMILLE) / durationMs);
}

/** Thousandths watched for progress lines: 0 while unknown, clamped to 0..1000. */
export function vodPermille(positionMs: number, durationMs: number): number {
  return Math.min(PERMILLE, Math.max(0, rawPermille(positionMs, durationMs)));
}
