import { describe, expect, it, vi } from 'vitest';
import { NO_OVERLAY, SEARCH_PROGRAM_ACTIONS, SearchOverlays } from './searchOverlay';

describe('SearchOverlays', () => {
  it('starts on None, shows one overlay at a time and dismisses it', () => {
    const overlays = new SearchOverlays();
    const listener = vi.fn();
    overlays.subscribe(listener);
    expect(overlays.current).toBe(NO_OVERLAY);
    expect(overlays.dismiss()).toBe(false);
    overlays.show({ kind: 'ComingSoon', feature: 'Record' });
    expect(overlays.snapshot()).toEqual({ kind: 'ComingSoon', feature: 'Record' });
    expect(overlays.dismiss()).toBe(true);
    expect(overlays.current.kind).toBe('None');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('lists the guide-cell dropdown rows in capture order', () => {
    expect(SEARCH_PROGRAM_ACTIONS).toEqual([
      'Remind',
      'Record',
      'Custom recording',
      'Add to My list',
      'Program description',
    ]);
  });
});
