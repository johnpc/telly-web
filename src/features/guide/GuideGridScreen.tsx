import type { JSX } from 'react';
import { GuideRowScreen } from './GuideRowScreen';
import type { GuideController } from './guideController';
import { dp } from './guideGeometry';
import type { GuideRow } from './guideModel';
import type { GuideStyle } from './guideStyle';
import { nowLineOffset } from './guideTimeline';

interface GridProps {
  controller: GuideController;
  rows: readonly GuideRow[];
  style: GuideStyle;
  playingId: number | null;
}

/** One row of overscan above and below the visible band keeps a vertical step seamless. */
const OVERSCAN = 1;

/**
 * The virtualized grid: only the rows inside the visible band (+overscan)
 * render, each row only the cells the shared horizontal scroll exposes; the
 * timeline header and every row pan in lockstep off one scroll offset. The
 * thin now-line runs down the grid at the sampled "now".
 */
export function GuideGridScreen({ controller, rows, style, playingId }: GridProps): JSX.Element {
  const { engine, originMs, now, dims } = controller;
  const focus = engine.focus;
  const first = Math.max(0, engine.firstRow - OVERSCAN);
  const last = Math.min(
    rows.length,
    engine.firstRow + Math.max(style.visibleRows, dims.gridRows) + OVERSCAN + 1,
  );
  const dimFocus = controller.layer.kind === 'Groups';
  const nowX = nowLineOffset(now, originMs, engine.scrollX, dims.timeViewportDp);
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden" data-testid="guide-grid">
      <div
        className="absolute inset-x-0 top-0"
        style={{ transform: `translateY(${dp(-engine.firstRow * style.rowHeightDp)})` }}
      >
        {rows.slice(first, last).map((row, offset) => {
          const index = first + offset;
          return (
            <GuideRowScreen
              key={row.channel.id}
              row={row}
              top={index * style.rowHeightDp}
              focusedCell={focus?.rowIndex === index ? focus.cell : null}
              playing={row.channel.id === playingId}
              dimFocus={dimFocus}
              scrollXDp={engine.scrollX}
              originMs={originMs}
              nowMs={now}
              style={style}
              dims={dims}
            />
          );
        })}
      </div>
      {nowX !== null && (
        <div
          className="pointer-events-none absolute inset-y-0 bg-telly-now-line"
          style={{ left: dp(dims.channelColumnDp + nowX), width: dp(1) }}
          data-testid="now-line"
        />
      )}
    </div>
  );
}
