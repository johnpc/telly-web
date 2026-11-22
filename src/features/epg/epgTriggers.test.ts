import { describe, expect, it } from 'vitest';
import { epgRelevantPairs, epgSignature, sameEpgPairs } from './epgTriggers';

describe('epgTriggers', () => {
  const a = [{ url: 'http://a', epgUrl: 'http://e' }];
  it('reduces playlists to (url, epgUrl) pairs and compares them', () => {
    expect(epgRelevantPairs(a)).toEqual([['http://a', 'http://e']]);
    expect(
      sameEpgPairs(epgRelevantPairs(a), epgRelevantPairs([{ url: 'http://a', epgUrl: 'http://e' }])),
    ).toBe(true);
    expect(sameEpgPairs(epgRelevantPairs(a), epgRelevantPairs([{ url: 'http://a', epgUrl: null }]))).toBe(
      false,
    );
    expect(sameEpgPairs(epgRelevantPairs(a), [])).toBe(false);
    expect(sameEpgPairs([], [])).toBe(true);
  });

  it('the signature ignores stamp-only changes', () => {
    const stamped = [{ url: 'http://a', epgUrl: 'http://e', epgLastUpdatedMs: 99, epgFailedAtMs: 0 }];
    expect(epgSignature(a)).toBe(epgSignature(stamped));
    expect(epgSignature(a)).not.toBe(epgSignature([...a, { url: 'http://b', epgUrl: null }]));
  });
});
