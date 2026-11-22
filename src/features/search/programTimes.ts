// Search's time strings are the shared `core/time` implementation (one source
// of truth across guide, panel, playback, search and the acceptance steps).
export { type ClockStyle, TWELVE_HOUR, clockStyleOf } from '@/core/time/clockStyle';
export {
  PERMILLE,
  airTimeText,
  clockText,
  dayText,
  progressPermille,
  rangeText,
  remainingMinutes,
  sameLocalDay,
  startTimeText,
} from '@/core/time/programTimes';
