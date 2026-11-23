import type { JSX } from 'react';
import type { GuideController } from './guideController';
import { sp } from './guideCss';
import { DP_PER_30_MIN, dp } from './guideGeometry';
import { type ClockStyle, clock } from './guideTimes';
import { type GuideTick, nowLineOffset, ticks } from './guideTimeline';

interface HeaderProps {
  controller: GuideController;
  clockStyle: ClockStyle;
}

interface TicksProps {
  ticks: GuideTick[];
  nowX: number | null;
}

/** The scrolling 30-min labels (centred on their tick) and the dot heading the now-line. */
function TimelineTicks({ ticks: labels, nowX }: TicksProps): JSX.Element {
  return (
    <div className="relative h-full flex-1" data-testid="guide-timeline">
      {labels.map((tick) => (
        <span
          key={tick.offsetDp}
          className="absolute top-1/2 -translate-y-1/2 text-center text-telly-text-muted"
          style={{ left: dp(tick.offsetDp - DP_PER_30_MIN / 2), width: dp(DP_PER_30_MIN), fontSize: sp(13) }}
          data-testid="guide-tick"
        >
          {tick.label}
        </span>
      ))}
      {nowX !== null && (
        <span
          className="absolute bottom-0 rounded-full bg-telly-now-line"
          style={{ left: dp(nowX - 2.5), width: dp(5), height: dp(5) }}
        />
      )}
    </div>
  );
}

/**
 * Header row (uidump 24): blue date+clock over the channel column, the
 * timeline labels panning with the grid, and the thin divider underneath.
 */
export function GuideHeaderScreen({ controller, clockStyle }: HeaderProps): JSX.Element {
  const scrollX = controller.engine.scrollX;
  const { originMs, now, dims } = controller;
  return (
    <div className="shrink-0" style={{ paddingTop: dp(12) }}>
      <div className="flex items-center" style={{ height: dp(27) }}>
        <div
          className="shrink-0 truncate text-telly-clock-blue"
          style={{
            width: dp(dims.channelColumnDp),
            paddingLeft: dp(16),
            fontSize: sp(dims.compact ? 12 : 14),
          }}
        >
          <span data-testid="guide-clock">{clock(now, clockStyle)}</span>
        </div>
        <TimelineTicks
          ticks={ticks(originMs, scrollX, dims.timeViewportDp, clockStyle)}
          nowX={nowLineOffset(now, originMs, scrollX, dims.timeViewportDp)}
        />
      </div>
      <div className="w-full bg-telly-pane-divider" style={{ height: dp(1), marginBottom: dp(2) }} />
    </div>
  );
}
