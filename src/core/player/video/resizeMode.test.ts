import { describe, expect, it } from 'vitest';
import { objectFitOf, resizeModeOf } from './resizeMode';

describe('resize mode', () => {
  it('parses the persisted raw value like Android, unknown → Fit', () => {
    expect(resizeModeOf('Fit')).toBe('Fit');
    expect(resizeModeOf(' stretch ')).toBe('Stretch');
    expect(resizeModeOf('FILL')).toBe('Fill');
    expect(resizeModeOf('crop')).toBe('Zoom');
    expect(resizeModeOf('zoom')).toBe('Zoom');
    expect(resizeModeOf('fixed width')).toBe('Fit');
    expect(resizeModeOf('')).toBe('Fit');
  });

  it('maps onto CSS object-fit (Fill and Stretch are both FILL, as in Media3)', () => {
    expect(objectFitOf('Fit')).toBe('contain');
    expect(objectFitOf('Fill')).toBe('fill');
    expect(objectFitOf('Stretch')).toBe('fill');
    expect(objectFitOf('Zoom')).toBe('cover');
  });
});
