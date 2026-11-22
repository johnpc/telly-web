import { describe, expect, it } from 'vitest';
import { GUIDE_CELL_ACTIONS, cellContains, hasInfo } from './guideModel';
import { Observable } from './observable';
import { ORIGIN, cell } from './testFixtures';

describe('guideModel', () => {
  it('tests cell containment and info', () => {
    const c = cell(ORIGIN, ORIGIN + 10);
    expect(cellContains(c, ORIGIN)).toBe(true);
    expect(cellContains(c, ORIGIN + 10)).toBe(false);
    expect(hasInfo(c)).toBe(true);
    expect(hasInfo({ ...c, program: null })).toBe(false);
    expect(GUIDE_CELL_ACTIONS[0]).toBe('Play channel');
  });
});

describe('Observable', () => {
  it('notifies subscribers and bumps the version until unsubscribed', () => {
    class Counter extends Observable {
      bump(): void {
        this.notify();
      }
    }
    const counter = new Counter();
    let calls = 0;
    const off = counter.subscribe(() => (calls += 1));
    counter.bump();
    off();
    counter.bump();
    expect(calls).toBe(1);
    expect(counter.version).toBe(2);
  });
});
