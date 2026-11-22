import { describe, expect, it, vi } from 'vitest';
import { type CellActionDeps, onCellAction } from './guideCellMenuActions';
import { GuideFocusEngine } from './guideFocusEngine';
import { GuideFocusMemory } from './guideFocusMemory';
import { GRID } from './guideLayer';
import { GuideMenuController } from './guideMenuController';
import { ORIGIN, cell, channel, row } from './testFixtures';

function make(withRow = true): CellActionDeps & { spies: Record<string, ReturnType<typeof vi.fn>> } {
  const rows = withRow ? [row(channel(1), ORIGIN, 2)] : [];
  const engine = new GuideFocusEngine(
    ORIGIN,
    () => 0,
    () => 7,
  );
  engine.ensureFocus(rows, ORIGIN);
  const menu = new GuideMenuController({
    focusedRow: () => rows[0],
    focusMemory: new GuideFocusMemory(
      engine,
      () => 7,
      () => rows,
    ),
    closeOptionsDialog: () => false,
  });
  menu.openCellMenu(cell(ORIGIN, ORIGIN + 1));
  const spies = { playChannel: vi.fn(), toggleReminder: vi.fn(), toggleMyList: vi.fn() };
  return { menu, focusedRow: () => rows[0], ...spies, spies };
}

describe('onCellAction', () => {
  it('plays, reminds and saves; description and the record rows open coming-soon', () => {
    const deps = make();
    onCellAction(deps, 'Play channel');
    expect(deps.spies.playChannel).toHaveBeenCalledWith(channel(1));
    expect(deps.menu.layer).toEqual(GRID);
    deps.menu.openCellMenu(cell(ORIGIN, ORIGIN + 1));
    onCellAction(deps, 'Remind');
    expect(deps.spies.toggleReminder).toHaveBeenCalled();
    deps.menu.openCellMenu(cell(ORIGIN, ORIGIN + 1));
    onCellAction(deps, 'Add to My list');
    expect(deps.spies.toggleMyList).toHaveBeenCalled();
    expect(deps.menu.layer).toEqual(GRID);
    onCellAction(deps, 'Program description');
    expect(deps.menu.layer).toMatchObject({ kind: 'ComingSoon', feature: 'Program description' });
    deps.menu.reset();
    onCellAction(deps, 'Record');
    expect(deps.menu.layer).toMatchObject({ kind: 'ComingSoon', feature: 'Record' });
  });
  it('falls back to coming-soon for a filler cell or no row', () => {
    const deps = make();
    deps.menu.openCellMenu(cell(ORIGIN, ORIGIN + 1, false));
    onCellAction(deps, 'Remind');
    expect(deps.menu.layer).toMatchObject({ kind: 'ComingSoon', feature: 'Remind' });
    const empty = make(false);
    onCellAction(empty, 'Play channel');
    expect(empty.spies.playChannel).not.toHaveBeenCalled();
    onCellAction(empty, 'Add to My list');
    expect(empty.menu.layer.kind).toBe('ComingSoon');
  });
});
