import type { ProgramRow } from '@/core/db/types';
import { HALF_HOUR_MS } from './guideGeometry';
import type { GuideCell } from './guideModel';
import type { GuideSpan } from './guideWindowMath';

/** The first 30-min mark of the span's grid strictly after `timeMs`. */
function nextGridMark(timeMs: number, span: GuideSpan): number {
  const steps = Math.floor((timeMs - span.fromMs) / HALF_HOUR_MS) + 1;
  return span.fromMs + steps * HALF_HOUR_MS;
}

function appendFillers(cells: GuideCell[], fromMs: number, toMs: number, span: GuideSpan): void {
  let startMs = fromMs;
  while (startMs < toMs) {
    const endMs = Math.min(nextGridMark(startMs, span), toMs);
    cells.push({ startMs, endMs, program: null });
    startMs = endMs;
  }
}

/** Adds one programme (gap-filled) and returns the advanced cursor. */
function appendProgram(cells: GuideCell[], program: ProgramRow, cursorMs: number, span: GuideSpan): number {
  if (program.endMs <= cursorMs || program.startMs >= span.toMs) return cursorMs;
  appendFillers(cells, cursorMs, program.startMs, span);
  cells.push({ startMs: program.startMs, endMs: program.endMs, program });
  return program.endMs;
}

/**
 * Turns one channel's programmes into contiguous cells over a span. EPG
 * gaps (and EPG-less channels) become "No information" fillers chunked at
 * the span's 30-min grid (Android `GuideCellsBuilder`).
 */
export function buildCells(programs: readonly ProgramRow[], span: GuideSpan): GuideCell[] {
  const cells: GuideCell[] = [];
  let cursorMs = span.fromMs;
  for (const program of [...programs].sort((a, b) => a.startMs - b.startMs)) {
    cursorMs = appendProgram(cells, program, cursorMs, span);
  }
  appendFillers(cells, cursorMs, span.toMs, span);
  return cells;
}
