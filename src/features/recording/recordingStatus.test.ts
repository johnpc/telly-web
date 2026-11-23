import { describe, expect, it } from 'vitest';
import { isPlanned, recordingStatus, statusOf } from './recordingStatus';

describe('RecordingStatus', () => {
  it('reads the four persisted names back', () => {
    expect(statusOf('SCHEDULED')).toBe('SCHEDULED');
    expect(statusOf('RECORDING')).toBe('RECORDING');
    expect(statusOf('DONE')).toBe('DONE');
    expect(statusOf('FAILED')).toBe('FAILED');
  });

  it('reads unknown raw values as FAILED instead of crashing the library', () => {
    expect(statusOf('garbage')).toBe('FAILED');
    expect(recordingStatus({ status: '' })).toBe('FAILED');
  });

  it('counts SCHEDULED and RECORDING as planned slots', () => {
    expect(isPlanned('SCHEDULED')).toBe(true);
    expect(isPlanned('RECORDING')).toBe(true);
    expect(isPlanned('DONE')).toBe(false);
    expect(isPlanned('FAILED')).toBe(false);
  });
});
