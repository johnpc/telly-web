import { rawPermille } from './vodStage';

/**
 * When a stored position is worth resuming (ux-spec §VOD, Android
 * `VodResumePolicy`): between 5% and 95% of the duration telly offers
 * Resume/Start-over; past 95% the item counts as finished and its position
 * is cleared.
 */
const MIN_RESUME_PERMILLE = 50;
const MAX_RESUME_PERMILLE = 950;

export function offerResume(positionMs: number, durationMs: number): boolean {
  const permille = rawPermille(positionMs, durationMs);
  return permille >= MIN_RESUME_PERMILLE && permille <= MAX_RESUME_PERMILLE;
}

export function finished(positionMs: number, durationMs: number): boolean {
  return rawPermille(positionMs, durationMs) > MAX_RESUME_PERMILLE;
}
