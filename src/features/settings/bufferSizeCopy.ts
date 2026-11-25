import { thresholdsFor } from '@/core/player/gate/bufferRunway';
import type { PickerOption } from './pickers/pickerSpec';

/**
 * The copy behind Settings → Playback → Buffer size. The one number a user is
 * really choosing is the runway built before the first frame (and again
 * after an underrun), so every label reads it from `thresholdsFor` — the
 * gate's own table — and states the trade-off: a longer runway starts later
 * and stalls less.
 */

/** The stored raw values, in picker order. */
export const BUFFER_SIZES: readonly string[] = ['Small', 'Medium', 'Large'];

/** Which line each runway suits. */
const FOR_LINES: Readonly<Record<string, string>> = {
  Small: 'for good lines',
  Medium: 'for jittery lines',
  Large: 'for lines that stall',
};

/** A stored value the picker knows, else the default the gate falls back to. */
function knownSize(raw: string): string {
  return BUFFER_SIZES.includes(raw) ? raw : 'Small';
}

/** Seconds of media buffered before a channel starts (Small 6 s, Medium 8 s, Large 12 s). */
export function runwaySeconds(raw: string): number {
  return thresholdsFor(knownSize(raw)).runwaySec;
}

/** Row summary: "Small · 6 s before a channel starts, for good lines". */
export function bufferSizeSummary(raw: string): string {
  const size = knownSize(raw);
  return `${size} · ${runwaySeconds(size)} s before a channel starts, ${FOR_LINES[size] ?? ''}`;
}

/** Picker option label: "Medium — 8 s to start, for jittery lines". */
export function bufferSizeOptionLabel(raw: string): string {
  const size = knownSize(raw);
  return `${size} — ${runwaySeconds(size)} s to start, ${FOR_LINES[size] ?? ''}`;
}

/** The picker's options: explained labels over the unchanged raw values. */
export function bufferSizeOptions(): PickerOption[] {
  return BUFFER_SIZES.map((raw) => ({ label: bufferSizeOptionLabel(raw), raw }));
}
