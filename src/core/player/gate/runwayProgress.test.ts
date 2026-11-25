import { describe, expect, it } from 'vitest';
import { NO_RUNWAY, RunwayStore, runwayPermille, runwaySeconds } from './runwayProgress';

describe('runwayProgress', () => {
  it('starts empty, notifies on a changed reading only, and reads back the last one', () => {
    const store = new RunwayStore();
    let changes = 0;
    store.subscribe(() => {
      changes += 1;
    });
    expect(store.get()).toBe(NO_RUNWAY);
    store.set({ ahead: 0, need: 6 });
    store.set({ ahead: 0, need: 6 });
    expect(changes).toBe(1);
    store.set({ ahead: 2.4, need: 6 });
    expect(changes).toBe(2);
    expect(store.get()).toEqual({ ahead: 2.4, need: 6 });
    store.set(NO_RUNWAY);
    expect(store.get()).toBe(NO_RUNWAY);
  });

  it('formats whole seconds clamped to the need and a permille for the bar', () => {
    expect(runwaySeconds({ ahead: 2.9, need: 6 })).toEqual({ ahead: 2, need: 6 });
    expect(runwaySeconds({ ahead: 7.5, need: 6 })).toEqual({ ahead: 6, need: 6 });
    expect(runwaySeconds({ ahead: -1, need: 12 })).toEqual({ ahead: 0, need: 12 });
    expect(runwayPermille({ ahead: 3, need: 6 })).toBe(500);
    expect(runwayPermille({ ahead: 9, need: 6 })).toBe(1000);
    expect(runwayPermille({ ahead: 1, need: 0 })).toBe(0);
    expect(runwayPermille({ ahead: -2, need: 6 })).toBe(0);
  });
});
