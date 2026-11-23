import { type ClockStyle, ProgramTimes } from '@/core/time';
import type { PlaybackInfoData } from '@/features/playback/info/playbackInfo';
import { type CatchupRequest, durationOf } from './catchupSession';

/**
 * Minimal honest adaptation of the info overlay during catch-up (Android
 * `CatchupInfo`): the archived programme's title and air times with a
 * position readout instead of the live now/next progress. Channel identity,
 * logo and badges stay.
 */
export function adaptCatchupInfo(
  data: PlaybackInfoData,
  request: CatchupRequest,
  positionMs: number,
  style: ClockStyle,
): PlaybackInfoData {
  const durationMs = durationOf(request);
  return {
    ...data,
    title: request.title ?? data.title,
    timeRange: ProgramTimes.range(request.startMs, request.endMs, style),
    remaining: null,
    progressPermille: ProgramTimes.progressPermille(0, durationMs, positionMs),
    description: null,
    nextLine: null,
    elapsed: ProgramTimes.span(positionMs),
    duration: ProgramTimes.span(durationMs),
  };
}
