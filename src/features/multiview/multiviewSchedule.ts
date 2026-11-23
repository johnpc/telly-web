import type { ProgramRow } from '@/core/db/types';
import { ProgramTimes, type ClockStyle } from '@/core/time';
import { programTitle } from '@/features/epg/nowNext';

/** One schedule row of the picker's middle pane: "12:45 AM  Title: Sub". */
export interface MultiviewScheduleRow {
  key: number;
  timeText: string;
  title: string;
  airing: boolean;
}

const HOUR_MS = 3_600_000;
/** The picker's schedule window: 6 h back to 18 h ahead (Android `MultiviewSchedule`). */
export const PAST_MS = 6 * HOUR_MS;
export const FUTURE_MS = 18 * HOUR_MS;

/** Pure schedule assembly: time + programme rows for the focused channel, chronological. */
export function buildSchedule(
  programs: readonly ProgramRow[],
  atMs: number,
  style: ClockStyle,
): MultiviewScheduleRow[] {
  return [...programs]
    .sort((a, b) => a.startMs - b.startMs)
    .map((program) => ({
      key: program.startMs,
      timeText: ProgramTimes.startTime(program.startMs, style),
      title: programTitle(program),
      airing: atMs >= program.startMs && atMs < program.endMs,
    }));
}
