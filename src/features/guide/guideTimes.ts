// Guide time strings are the shared `core/time` implementation.
export { type ClockStyle, CLOCK_12H, CLOCK_24H, is24Raw } from '@/core/time/clockStyle';
export {
  PERMILLE,
  clockText as clock,
  progressPermille,
  rangeText as range,
  remainingMinutes,
  startTimeText as timeLabel,
} from '@/core/time/programTimes';
