import { describe, expect, it } from 'vitest';
import { thresholdsFor } from '@/core/player/gate/bufferRunway';
import {
  BUFFER_SIZES,
  bufferSizeOptionLabel,
  bufferSizeOptions,
  bufferSizeSummary,
  runwaySeconds,
} from './bufferSizeCopy';

describe('bufferSizeCopy', () => {
  it('reads every runway from the buffer gate table, never a second copy', () => {
    for (const size of BUFFER_SIZES) expect(runwaySeconds(size)).toBe(thresholdsFor(size).runwaySec);
    expect(BUFFER_SIZES.map(runwaySeconds)).toEqual([6, 8, 12]);
  });

  it('explains the row summary in seconds plus the trade-off', () => {
    expect(bufferSizeSummary('Small')).toBe('Small · 6 s before a channel starts, for good lines');
    expect(bufferSizeSummary('Medium')).toBe('Medium · 8 s before a channel starts, for jittery lines');
    expect(bufferSizeSummary('Large')).toBe('Large · 12 s before a channel starts, for lines that stall');
  });

  it('labels the picker options with the seconds and keeps the stored raw values', () => {
    expect(bufferSizeOptionLabel('Large')).toBe('Large — 12 s to start, for lines that stall');
    expect(bufferSizeOptions()).toEqual([
      { label: 'Small — 6 s to start, for good lines', raw: 'Small' },
      { label: 'Medium — 8 s to start, for jittery lines', raw: 'Medium' },
      { label: 'Large — 12 s to start, for lines that stall', raw: 'Large' },
    ]);
  });

  it('falls back to Small for a stored value the picker does not know, like the gate does', () => {
    expect(runwaySeconds('Huge')).toBe(thresholdsFor('Huge').runwaySec);
    expect(bufferSizeSummary('Huge')).toBe(bufferSizeSummary('Small'));
  });
});
