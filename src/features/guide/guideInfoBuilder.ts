import { programTitle } from '@/features/epg/nowNext';
import { type GuideCell, type GuideFocus, type GuideRow, NO_INFORMATION, cellContains } from './guideModel';
import { type ClockStyle, progressPermille, range, remainingMinutes } from './guideTimes';

/** Everything the guide's top-right info pane renders (uidump 24). */
export interface GuideInfoData {
  title: string;
  range: string;
  remaining: string | null;
  progressPermille: number | null;
  description: string | null;
  group: string | null;
  favorite: boolean;
}

/** Title, "02:30 — 03:45 PM", remaining + progress (airing cells only), description, group. */
export function buildInfo(row: GuideRow, cell: GuideCell, nowMs: number, style: ClockStyle): GuideInfoData {
  const airing = cellContains(cell, nowMs);
  return {
    title: cell.program === null ? NO_INFORMATION : programTitle(cell.program),
    range: range(cell.startMs, cell.endMs, style),
    remaining: airing ? `${remainingMinutes(cell.endMs, nowMs)} min` : null,
    progressPermille: airing ? progressPermille(cell.startMs, cell.endMs, nowMs) : null,
    description: cell.program?.description ?? null,
    group: row.channel.groupTitle,
    favorite: row.channel.favorite,
  };
}

/** The pane for the focused cell of `rows`; null with nothing focused. */
export function infoFor(
  rows: readonly GuideRow[],
  focused: GuideFocus | null,
  nowMs: number,
  style: ClockStyle,
): GuideInfoData | null {
  const row = focused === null ? undefined : rows[focused.rowIndex];
  return row === undefined || focused === null ? null : buildInfo(row, focused.cell, nowMs, style);
}
