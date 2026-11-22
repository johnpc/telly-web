import { describe, expect, it } from 'vitest';
import { epgFreshnessOf, isEpgDue, RETRY_BACKOFF_MS } from './epgFreshness';
import { DEFAULT_INTERVAL_MS, HOUR_MS, hoursToMs, isRefreshDue, NEVER_MS } from './refreshScheduler';

describe('refreshScheduler', () => {
  it('is due when never fetched, or past the interval; never periodic at interval 0', () => {
    expect(isRefreshDue(0, 5, NEVER_MS)).toBe(true);
    expect(isRefreshDue(10, 10 + HOUR_MS, NEVER_MS)).toBe(false);
    expect(isRefreshDue(10, 10 + HOUR_MS - 1, HOUR_MS)).toBe(false);
    expect(isRefreshDue(10, 10 + HOUR_MS, HOUR_MS)).toBe(true);
    expect(hoursToMs(0)).toBe(NEVER_MS);
    expect(hoursToMs(-2)).toBe(NEVER_MS);
    expect(hoursToMs(24)).toBe(DEFAULT_INTERVAL_MS);
  });
});

describe('EpgFreshness', () => {
  it('reads the state off the two persisted stamps', () => {
    expect(epgFreshnessOf({ epgLastUpdatedMs: 0, epgFailedAtMs: 0 })).toEqual({ kind: 'NeverFetched' });
    expect(epgFreshnessOf({ epgLastUpdatedMs: 5, epgFailedAtMs: 0 })).toEqual({ kind: 'Fresh', atMs: 5 });
    expect(epgFreshnessOf({ epgLastUpdatedMs: 5, epgFailedAtMs: 9 })).toEqual({
      kind: 'Failed',
      failedAtMs: 9,
      lastSuccessMs: 5,
    });
    expect(epgFreshnessOf({ epgLastUpdatedMs: 9, epgFailedAtMs: 5 })).toEqual({ kind: 'Fresh', atMs: 9 });
    expect(epgFreshnessOf({ epgLastUpdatedMs: 0, epgFailedAtMs: 3 })).toEqual({
      kind: 'Failed',
      failedAtMs: 3,
      lastSuccessMs: 0,
    });
  });

  it('NeverFetched is always due; Fresh follows the interval', () => {
    expect(isEpgDue({ kind: 'NeverFetched' }, 0, NEVER_MS)).toBe(true);
    expect(isEpgDue({ kind: 'Fresh', atMs: 10 }, 10 + HOUR_MS, NEVER_MS)).toBe(false);
    expect(isEpgDue({ kind: 'Fresh', atMs: 10 }, 10 + HOUR_MS, HOUR_MS)).toBe(true);
  });

  it('Failed backs off five minutes, then follows the interval off the last success', () => {
    const failed = { kind: 'Failed', failedAtMs: 1000, lastSuccessMs: 0 } as const;
    expect(isEpgDue(failed, 1000 + RETRY_BACKOFF_MS - 1, NEVER_MS)).toBe(false);
    expect(isEpgDue(failed, 1000 + RETRY_BACKOFF_MS, NEVER_MS)).toBe(true);
    const failedAfterSuccess = { kind: 'Failed', failedAtMs: 1000, lastSuccessMs: 500 } as const;
    expect(isEpgDue(failedAfterSuccess, 1000 + RETRY_BACKOFF_MS, NEVER_MS)).toBe(false);
    expect(isEpgDue(failedAfterSuccess, 500 + HOUR_MS, HOUR_MS)).toBe(true);
  });
});
