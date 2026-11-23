import { describe, expect, it } from 'vitest';
import { finished, offerResume } from './vodResumePolicy';

describe('vodResumePolicy', () => {
  it('offers resume inside the 5%..95% band only', () => {
    expect(offerResume(49, 1000)).toBe(false);
    expect(offerResume(50, 1000)).toBe(true);
    expect(offerResume(950, 1000)).toBe(true);
    expect(offerResume(951, 1000)).toBe(false);
  });

  it('never offers resume for an unknown duration', () => {
    expect(offerResume(500, 0)).toBe(false);
    expect(finished(500, 0)).toBe(false);
  });

  it('counts the item finished past 95%', () => {
    expect(finished(950, 1000)).toBe(false);
    expect(finished(951, 1000)).toBe(true);
    expect(finished(1000, 1000)).toBe(true);
  });
});
