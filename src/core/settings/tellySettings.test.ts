import { describe, expect, it } from 'vitest';
import { TellySettings } from './tellySettings';

describe('TellySettings', () => {
  it('uses every Android key exactly once plus the web-only proxy keys', () => {
    const keys = Object.values(TellySettings).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('general_udp_proxy');
    expect(TellySettings.CORS_PROXY.key).toBe('general_cors_proxy');
    expect(TellySettings.CORS_PROXY_PROBED.key).toBe('general_cors_proxy_probed');
    expect(keys).toHaveLength(65);
  });

  it('keeps the captured defaults', () => {
    expect(TellySettings.LAST_CHANNEL_ON_START.default).toBe(true);
    expect(TellySettings.EPG_UPDATE_INTERVAL_HOURS.default).toBe(0);
    expect(TellySettings.EPG_PAST_DAYS_TO_KEEP.default).toBe(7);
    expect(TellySettings.PARENTAL_RELOCK.default).toBe('Always require');
    expect(TellySettings.SKIP_STEPS.default).toBe('10s / 30s / 1m / 5m');
    expect(TellySettings.PARENTAL_LOCKED_GROUPS.key).toBe('parental_locked_groups');
  });
});
