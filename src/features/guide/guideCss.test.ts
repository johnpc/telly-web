import { describe, expect, it } from 'vitest';
import { SCRIM_COLOR, guideBackground, sp } from './guideCss';
import { GEAR_ID, groupFocusId, inGroupsPane } from './guideKeyRouting';
import { msToNextMinute, startMinuteTicker } from './guideNowTicker';

describe('guideCss', () => {
  it('scales sp with the viewport and the font-size setting, and builds the backgrounds', () => {
    expect(sp(14)).toBe('calc(14 * var(--dp) * var(--telly-font-scale, 1))');
    expect(guideBackground(1)).toBe('rgba(19, 22, 25, 1)');
    expect(guideBackground(0.9)).toBe('rgba(19, 22, 25, 0.9)');
    expect(SCRIM_COLOR).toBe('rgba(0, 0, 0, 0.6)');
    expect(groupFocusId('All channels')).toBe('guide-group-All channels');
    expect(GEAR_ID).toBe('guide-rail-settings');
    expect(inGroupsPane(GEAR_ID)).toBe(true);
    expect(inGroupsPane(groupFocusId('News'))).toBe(true);
    expect(inGroupsPane('guide-sheet-Search')).toBe(false);
    expect(inGroupsPane(null)).toBe(false);
  });
});

describe('startMinuteTicker', () => {
  it('fires on the minute and on visibility, and ignores hidden documents', () => {
    const fired: number[] = [];
    let clock = 59_000;
    const listeners = new Map<string, () => void>();
    let visibilityState = 'hidden';
    const target = {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener: (type: string, listener: () => void) => void listeners.set(type, listener),
      removeEventListener: (type: string) => void listeners.delete(type),
    } as unknown as Document;
    const timeouts: (() => void)[] = [];
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    globalThis.setTimeout = ((fn: () => void, ms: number) => {
      expect(ms).toBe(msToNextMinute(clock));
      timeouts.push(fn);
      return timeouts.length;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = (() => undefined) as unknown as typeof clearTimeout;
    try {
      const stop = startMinuteTicker(
        (now) => fired.push(now),
        () => clock,
        target,
      );
      listeners.get('visibilitychange')?.();
      expect(fired).toEqual([]);
      visibilityState = 'visible';
      listeners.get('visibilitychange')?.();
      expect(fired).toEqual([59_000]);
      clock = 60_000;
      timeouts.shift()?.();
      expect(fired).toEqual([59_000, 60_000]);
      expect(timeouts).toHaveLength(1);
      stop();
      expect(listeners.size).toBe(0);
    } finally {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    }
    expect(msToNextMinute(1_000)).toBe(59_000);
  });
});
