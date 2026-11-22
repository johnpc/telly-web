import type { JSX } from 'react';
import { programTitle } from '@/features/epg/nowNext';
import { GuideChannelColumnScreen } from './GuideChannelColumnScreen';
import { type GuideCellPlacement, placeCell } from './guideCellLayout';
import { sp } from './guideCss';
import { TIME_VIEWPORT_DP, dp } from './guideGeometry';
import { type GuideCell, type GuideRow, NO_INFORMATION } from './guideModel';
import type { GuideStyle } from './guideStyle';

interface RowProps {
  row: GuideRow;
  top: number;
  focusedCell: GuideCell | null;
  playing: boolean;
  dimFocus: boolean;
  scrollXDp: number;
  originMs: number;
  nowMs: number;
  style: GuideStyle;
}

interface CellProps {
  cell: GuideCell;
  placement: GuideCellPlacement;
  focused: boolean;
  dimFocus: boolean;
  past: boolean;
}

function cellClasses(focused: boolean, dimFocus: boolean, past: boolean): string {
  if (focused && dimFocus) return 'bg-telly-guide-cell-selected text-white';
  if (focused) return 'bg-telly-focus-fill text-telly-focus-text';
  return past ? 'bg-telly-guide-cell text-white/35' : 'bg-telly-guide-cell text-white/90';
}

/** One programme cell: rounded #1B1E21 pill with a 2 dp gap, single-line ellipsized title. */
function GuideCellScreen({ cell, placement, focused, dimFocus, past }: CellProps): JSX.Element {
  const padding = { paddingRight: dp(2), paddingTop: dp(1), paddingBottom: dp(1) };
  return (
    <div
      className="absolute inset-y-0 flex items-center"
      style={{ left: dp(placement.offsetDp), width: dp(placement.widthDp), ...padding }}
      data-testid="guide-cell"
      data-focused={focused ? 'true' : undefined}
    >
      <div
        className={`flex h-full w-full items-center overflow-hidden rounded-[4px] ${cellClasses(focused, dimFocus, past)}`}
      >
        <span className="truncate" style={{ paddingLeft: dp(8), paddingRight: dp(8), fontSize: sp(14) }}>
          {cell.program === null ? NO_INFORMATION : programTitle(cell.program)}
        </span>
      </div>
    </div>
  );
}

/**
 * One grid row (uidump 24, 78 px pitch): the fixed channel column, then the
 * cell strip clipped to the time viewport, only the exposed cells rendered.
 */
export function GuideRowScreen(props: RowProps): JSX.Element {
  const { row, focusedCell, playing, style } = props;
  return (
    <div
      className="absolute inset-x-0 flex items-center"
      style={{ top: dp(props.top), height: dp(style.rowHeightDp) }}
      data-testid={`panel-row-${row.channel.id}`}
      data-guide-row
      data-channel-id={row.channel.id}
      data-playing={playing ? 'true' : undefined}
      data-focused-row={focusedCell !== null ? 'true' : undefined}
    >
      <GuideChannelColumnScreen row={row} playing={playing} showNumber={style.showChannelNumbers} />
      <div className="relative h-full flex-1 overflow-hidden" style={{ maxWidth: dp(TIME_VIEWPORT_DP) }}>
        {row.cells.map((cell) => {
          const placement = placeCell(cell, props.originMs, props.scrollXDp, TIME_VIEWPORT_DP);
          if (placement === null) return null;
          return (
            <GuideCellScreen
              key={cell.startMs}
              cell={cell}
              placement={placement}
              focused={cell.startMs === focusedCell?.startMs}
              dimFocus={props.dimFocus}
              past={cell.endMs <= props.nowMs}
            />
          );
        })}
      </div>
    </div>
  );
}
