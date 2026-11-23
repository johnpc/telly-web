import { describe, expect, it } from 'vitest';
import { GRID, GROUPS, type GuideLayer, ROW_MENU, backOf, descriptionLayer, isPushed } from './guideLayer';
import type { GroupToolSession } from '@/features/groups/groupToolSession';

const session = {} as GroupToolSession;

describe('backOf', () => {
  it('pops pushed screens to their back, tools to the sheet, everything else to the grid', () => {
    const cases: [GuideLayer, GuideLayer][] = [
      [{ kind: 'ComingSoon', feature: 'x', back: ROW_MENU }, ROW_MENU],
      [{ kind: 'Description', title: 't', text: 'd', back: GRID }, GRID],
      [{ kind: 'BlockPin', channelId: 1, mode: 'Enter PIN', back: ROW_MENU }, ROW_MENU],
      [{ kind: 'GroupTool', session }, ROW_MENU],
      [{ kind: 'GroupPin', group: 'Movies' }, GROUPS],
      [{ kind: 'ChannelOptions', channelId: 1, dialog: null }, GRID],
      [ROW_MENU, GRID],
      [GROUPS, GRID],
    ];
    for (const [layer, back] of cases) expect(backOf(layer)).toEqual(back);
  });
  it('builds the description layer from the info pane and classifies pushed layers', () => {
    expect(descriptionLayer(null)).toMatchObject({
      kind: 'Description',
      title: 'No information',
      text: 'No information',
    });
    expect(descriptionLayer({ title: 'T', description: 'D' } as never)).toMatchObject({
      title: 'T',
      text: 'D',
      back: ROW_MENU,
    });
    expect(isPushed(GRID)).toBe(false);
    expect(isPushed({ kind: 'CellMenu', cell: { startMs: 0, endMs: 1, program: null } })).toBe(false);
    expect(isPushed({ kind: 'ChannelOptions', channelId: 1, dialog: null })).toBe(true);
  });
});
