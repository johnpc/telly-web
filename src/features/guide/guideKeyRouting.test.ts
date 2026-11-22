import { describe, expect, it, vi } from 'vitest';
import { GEAR_ID, GROUP_PREFIX, type KeyRoutingContext, routeGuideKey } from './guideKeyRouting';

function ctx(layer: KeyRoutingContext['layer'], focusedId: string | null, exit = true) {
  const onKey = vi.fn(() => true);
  const focusGear = vi.fn();
  const exitFn = vi.fn(() => exit);
  return { ctx: { layer, focusedId, onKey, focusGear, exit: exitFn }, onKey, focusGear, exitFn };
}

describe('routeGuideKey', () => {
  it('routes every grid key through the policy and ignores digits', () => {
    const c = ctx('Grid', null);
    expect(routeGuideKey(c.ctx, 'LEFT')).toBe(true);
    expect(c.onKey).toHaveBeenCalledWith('LEFT');
    expect(routeGuideKey(c.ctx, { kind: 'DIGIT', digit: 1 })).toBe(false);
  });
  it('walks the groups column: BACK to the gear, RIGHT closes, rail BACK exits or warns', () => {
    const column = ctx('Groups', `${GROUP_PREFIX}News`);
    expect(routeGuideKey(column.ctx, 'BACK')).toBe(true);
    expect(column.focusGear).toHaveBeenCalled();
    expect(routeGuideKey(column.ctx, 'RIGHT')).toBe(true);
    expect(column.onKey).toHaveBeenCalledWith('RIGHT');
    expect(routeGuideKey(column.ctx, 'UP')).toBe(false);
    const rail = ctx('Groups', GEAR_ID);
    expect(routeGuideKey(rail.ctx, 'BACK')).toBe(false);
    expect(routeGuideKey(rail.ctx, 'RIGHT')).toBe(false);
    const armed = ctx('Groups', GEAR_ID, false);
    expect(routeGuideKey(armed.ctx, 'BACK')).toBe(true);
  });
  it('only BACK reaches the policy on overlaid layers', () => {
    const c = ctx('RowMenu', 'guide-sheet-Search');
    expect(routeGuideKey(c.ctx, 'OK')).toBe(false);
    expect(routeGuideKey(c.ctx, 'BACK')).toBe(true);
    expect(c.onKey).toHaveBeenCalledWith('BACK');
  });
});
