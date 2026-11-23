import { describe, expect, it, vi } from 'vitest';
import { executeCommand, type GuideCommandDeps } from './guideCommands';
import { GuideFocusEngine } from './guideFocusEngine';
import { GuideFocusMemory } from './guideFocusMemory';
import type { GuideCommand } from './guideKeyPolicy';
import { GRID, GROUPS, ROW_MENU } from './guideLayer';
import { GuideMenuController } from './guideMenuController';
import { ORIGIN, channel, row } from './testFixtures';

function make(): GuideCommandDeps & { menu: GuideMenuController; activate: ReturnType<typeof vi.fn> } {
  const rows = [row(channel(1), ORIGIN, 6), row(channel(2), ORIGIN, 6)];
  const engine = new GuideFocusEngine(
    ORIGIN,
    () => -100_000,
    () => 1,
  );
  engine.ensureFocus(rows, ORIGIN);
  const focusMemory = new GuideFocusMemory(
    engine,
    () => 1,
    () => rows,
  );
  const menu = new GuideMenuController({
    focusedRow: () => rows[0],
    focusMemory,
  });
  const activate = vi.fn();
  return { engine, menu, rows: () => rows, pastDays: () => 7, visibleRows: () => 1, activate };
}

const run = (deps: GuideCommandDeps, command: GuideCommand): void => executeCommand(deps, command);

describe('executeCommand', () => {
  it('moves focus and opens the groups column at the left edge', () => {
    const deps = make();
    run(deps, { kind: 'FocusRight' });
    expect(deps.engine.focus?.cell.startMs).toBe(ORIGIN + 3_600_000);
    run(deps, { kind: 'FocusLeft' });
    run(deps, { kind: 'FocusLeft' });
    expect(deps.menu.layer).toEqual(GROUPS);
    run(deps, { kind: 'CloseLayer' });
    expect(deps.menu.layer).toEqual(GRID);
    run(deps, { kind: 'FocusDown' });
    expect(deps.engine.focus?.rowIndex).toBe(1);
    run(deps, { kind: 'FocusUp' });
    expect(deps.engine.focus?.rowIndex).toBe(0);
    run(deps, { kind: 'PageRows', direction: 1 });
    expect(deps.engine.focus?.rowIndex).toBe(1);
  });
  it('jumps, pages and activates', () => {
    const deps = make();
    run(deps, { kind: 'DayJump', days: -1 });
    expect(deps.engine.scrollX).toBeLessThan(0);
    run(deps, { kind: 'PageJump', direction: 1 });
    expect(deps.engine.scrollX).toBeGreaterThan(-100_000 + 1);
    const edge = make();
    run(edge, { kind: 'PageJump', direction: -1 });
    expect(edge.menu.layer).toEqual(GROUPS);
    run(deps, { kind: 'Activate' });
    expect(deps.activate).toHaveBeenCalled();
  });
  it('opens the row sheet, the cell dropdown and the groups column', () => {
    const deps = make();
    run(deps, { kind: 'OpenRowMenu' });
    expect(deps.menu.layer).toEqual(ROW_MENU);
    deps.menu.reset();
    run(deps, { kind: 'OpenCellMenu' });
    expect(deps.menu.layer.kind).toBe('CellMenu');
    deps.menu.reset();
    run(deps, { kind: 'OpenGroups' });
    expect(deps.menu.layer).toEqual(GROUPS);
  });
});
