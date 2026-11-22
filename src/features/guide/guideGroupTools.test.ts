import { describe, expect, it } from 'vitest';
import { GRID, ROW_MENU } from './guideLayer';
import { openGroupTool } from './guideGroupTools';
import { ORIGIN, channel, row } from './testFixtures';
import { makeHarness } from './testHarness';

describe('openGroupTool (Group tool completion)', () => {
  it('pops to the grid only while that very session is still the layer', async () => {
    const { controller, deps } = await makeHarness();
    controller.setRows([row(channel(1), ORIGIN, 2)]);
    controller.onKey('MENU');
    openGroupTool(controller.menu, deps.groupTools, 'Create group', channel(1), 'All channels', []);
    const layer = controller.layer;
    if (layer.kind !== 'GroupTool') throw new Error('expected a tool layer');
    controller.menu.close();
    expect(controller.layer).toEqual(ROW_MENU);
    layer.session.submitText('Late');
    await new Promise((r) => setTimeout(r, 30));
    expect(controller.layer).toEqual(ROW_MENU);
    openGroupTool(controller.menu, deps.groupTools, 'Create group', channel(1), 'All channels', []);
    const open = controller.layer;
    if (open.kind !== 'GroupTool') throw new Error('expected a tool layer');
    open.session.submitText('On time');
    await new Promise((r) => setTimeout(r, 30));
    expect(controller.layer).toEqual(GRID);
  });
  it('falls back to coming-soon for a non-tool row', async () => {
    const { controller, deps } = await makeHarness();
    openGroupTool(controller.menu, deps.groupTools, 'Search', channel(1), 'All channels', []);
    expect(controller.layer).toEqual({ kind: 'ComingSoon', feature: 'Search', back: ROW_MENU });
  });
});
