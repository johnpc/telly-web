import { describe, expect, it } from 'vitest';
import { CLOCK_12H, CLOCK_24H } from '@/core/time';
import { durationText, recordingLabel, recordingRowId, recordingRows } from './recordingRows';
import { fakeRecording } from './recordingTestSupport';

const START = Date.UTC(2026, 8, 13, 14, 45);
const utc = (style: typeof CLOCK_12H): typeof CLOCK_12H => ({ ...style, timeZone: 'UTC' });

describe('recordingRows', () => {
  it('renders the status detail per state and the start in the clock style', () => {
    const rows = recordingRows(
      [
        fakeRecording({ id: 1, status: 'SCHEDULED', startMs: START }),
        fakeRecording({ id: 2, status: 'RECORDING', startMs: START }),
        fakeRecording({ id: 3, status: 'FAILED', startMs: START }),
        fakeRecording({
          id: 4,
          status: 'DONE',
          startMs: START,
          endMs: START + 42 * 60_000,
          sizeBytes: 12_900_000,
        }),
        fakeRecording({
          id: 5,
          status: 'DONE',
          startMs: START,
          endMs: null,
          plannedEndMs: START + 30_000,
          sizeBytes: 0,
        }),
        fakeRecording({ id: 6, status: 'bogus', startMs: START }),
      ],
      utc(CLOCK_12H),
    );
    expect(rows.map((row) => row.detailText)).toEqual([
      'Scheduled',
      'Recording',
      'Failed',
      '42 min · 12.3 MB',
      '1 min · 0 B',
      'Failed',
    ]);
    expect(rows[0]?.dateText).toBe('Sun, Sep 13, 2:45 PM');
    expect(rows[0]?.status).toBe('SCHEDULED');
    expect(recordingRows([fakeRecording({ startMs: START })], utc(CLOCK_24H))[0]?.dateText).toBe(
      'Sun, Sep 13, 14:45',
    );
  });

  it('rounds durations up to whole minutes', () => {
    expect(durationText(0, 61_000)).toBe('2 min');
    expect(durationText(0, 60_000)).toBe('1 min');
    expect(durationText(10, 5)).toBe('under 1 min');
  });

  it('labels a row for list hosts and keys its focus id by row id', () => {
    const [row] = recordingRows([fakeRecording({ id: 9, status: 'RECORDING' })]);
    if (row === undefined) throw new Error('no row');
    expect(recordingLabel(row)).toBe('Newsroom Live · News One · Recording');
    expect(recordingRowId(row)).toBe('recording-9');
  });
});
