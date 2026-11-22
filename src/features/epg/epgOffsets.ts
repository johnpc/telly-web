import type { TvgOffset } from '@/core/db/channelRepository';
import type { ProgramRow } from '@/core/db/types';

const MINUTE_MS = 60_000;

/**
 * Per-channel "EPG time offset" math (port of Android `EpgOffsets`): a
 * channel's programme times are SHIFTED by its offset for every lookup, so
 * the guide grid, info overlays and now/next all move together. Stored rows
 * keep their real times, so a window query reaches `offset` further back
 * (or forward) to catch rows that shift INTO the window.
 */
export type OffsetMap = ReadonlyMap<string, number>;

/** tvgId -> offset millis; first channel wins a shared tvg-id. */
export function offsetsOfMinutes(offsets: readonly TvgOffset[]): OffsetMap {
  const out = new Map<string, number>();
  for (const row of offsets) if (!out.has(row.tvgId)) out.set(row.tvgId, row.epgOffsetMinutes * MINUTE_MS);
  return out;
}

/** Query lower bound catching rows that shift forward into the window. */
export function queryFrom(fromMs: number, offsets: OffsetMap): number {
  return fromMs - Math.max(0, ...offsets.values());
}

/** Query upper bound catching rows that shift backward into the window. */
export function queryTo(toMs: number, offsets: OffsetMap): number {
  return toMs - Math.min(0, ...offsets.values());
}

function shiftOne(program: ProgramRow, offsetMs: number): ProgramRow {
  if (offsetMs === 0) return program;
  return { ...program, startMs: program.startMs + offsetMs, endMs: program.endMs + offsetMs };
}

/** Each programme moved by its channel's offset (0 when none). */
export function shifted(programs: readonly ProgramRow[], offsets: OffsetMap): ProgramRow[] {
  if (offsets.size === 0) return [...programs];
  return programs.map((program) => shiftOne(program, offsets.get(program.channelTvgId) ?? 0));
}

/** Shift, then trim back to the requested [fromMs, toMs) display window. */
export function windowed(
  programs: readonly ProgramRow[],
  offsets: OffsetMap,
  fromMs: number,
  toMs: number,
): ProgramRow[] {
  return shifted(programs, offsets).filter((p) => p.endMs > fromMs && p.startMs < toMs);
}
