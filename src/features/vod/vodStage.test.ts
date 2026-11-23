import { describe, expect, it } from 'vitest';
import { rawPermille, resumePrompt, vodPermille } from './vodStage';

describe('vodStage', () => {
  it('rawPermille is -1 for an unknown duration and unclamped otherwise', () => {
    expect(rawPermille(5, 0)).toBe(-1);
    expect(rawPermille(500, 1000)).toBe(500);
    expect(rawPermille(1500, 1000)).toBe(1500);
  });

  it('vodPermille clamps into 0..1000 and reads 0 while unknown', () => {
    expect(vodPermille(5, 0)).toBe(0);
    expect(vodPermille(-5, 100)).toBe(0);
    expect(vodPermille(250, 1000)).toBe(250);
    expect(vodPermille(2000, 1000)).toBe(1000);
  });

  it('resumePrompt carries the stored position', () => {
    expect(resumePrompt(12_000)).toEqual({ kind: 'ResumePrompt', positionMs: 12_000 });
  });
});
