import { describe, expect, it, vi } from 'vitest';
import { GuideFocusEngine } from './guideFocusEngine';
import { GuideFocusMemory } from './guideFocusMemory';
import { GRID, GROUPS, ROW_MENU } from './guideLayer';
import { GuideMenuController } from './guideMenuController';
import { ORIGIN, cell, channel, row } from './testFixtures';

function make(withRow = true) {
  const rows = withRow ? [row(channel(1), ORIGIN, 3)] : [];
  const engine = new GuideFocusEngine(
    ORIGIN,
    () => 0,
    () => 7,
  );
  engine.ensureFocus(rows, ORIGIN);
  const focusMemory = new GuideFocusMemory(
    engine,
    () => 7,
    () => rows,
  );
  const closeOptionsDialog = vi.fn(() => false);
  const menu = new GuideMenuController({
    focusedRow: () => rows[engine.focus?.rowIndex ?? -1],
    focusMemory,
    closeOptionsDialog,
  });
  return { menu, engine, focusMemory, closeOptionsDialog };
}

describe('GuideMenuController', () => {
  it('opens the sheet only with a focused row, remembering the grid focus', () => {
    const { menu, focusMemory } = make();
    menu.openRowMenu();
    expect(menu.layer).toEqual(ROW_MENU);
    expect(focusMemory.current).toBe('Saved');
    expect(menu.sheetChannelId).toBe(1);
    const empty = make(false);
    empty.menu.openRowMenu();
    expect(empty.menu.layer).toEqual(GRID);
  });
  it('pops one level at a time back to the grid, restoring focus', () => {
    const { menu, focusMemory, engine } = make();
    menu.openRowMenu();
    engine.moveRight([row(channel(1), ORIGIN, 3)]);
    menu.show({ kind: 'Description', title: 't', text: 'd', back: ROW_MENU });
    menu.close();
    expect(menu.layer).toEqual(ROW_MENU);
    menu.close();
    expect(menu.layer).toEqual(GRID);
    expect(focusMemory.current).toBe('Consumed');
    expect(engine.focus?.cell.startMs).toBe(ORIGIN);
  });
  it('closes an open Channel-options dialog before popping the pane', () => {
    const { menu, closeOptionsDialog } = make();
    menu.show({ kind: 'ChannelOptions', channelId: 1 });
    closeOptionsDialog.mockReturnValueOnce(true);
    menu.close();
    expect(menu.layer.kind).toBe('ChannelOptions');
    menu.close();
    expect(menu.layer).toEqual(GRID);
  });
  it('opens the cell dropdown only with a cell, and the helpers act then reset', () => {
    const { menu } = make();
    menu.openCellMenu(null);
    expect(menu.layer).toEqual(GRID);
    menu.openCellMenu(cell(ORIGIN, ORIGIN + 1));
    expect(menu.layer.kind).toBe('CellMenu');
    const action = vi.fn();
    menu.actThenReset(action);
    expect(action).toHaveBeenCalled();
    expect(menu.layer).toEqual(GRID);
    menu.comingSoon('Record', GROUPS);
    expect(menu.layer).toEqual({ kind: 'ComingSoon', feature: 'Record', back: GROUPS });
    menu.comingSoon('X');
    expect(menu.layer).toMatchObject({ back: GRID });
  });
});
