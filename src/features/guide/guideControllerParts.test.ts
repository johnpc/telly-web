import { describe, expect, it } from 'vitest';
import { TellySettings } from '@/core/settings/tellySettings';
import { OPTION } from './channelOptionsRows';
import { GRID, ROW_MENU } from './guideLayer';
import type { GuideRow } from './guideModel';
import { CLOCK_24H } from './guideTimes';
import { ORIGIN, row } from './testFixtures';
import { type Harness, makeHarness } from './testHarness';

async function withSheet(): Promise<Harness & { rows: GuideRow[] }> {
  const harness = await makeHarness();
  const rows = (await harness.channels.visible()).map((c, i) => row(c, ORIGIN, 4, i + 1));
  harness.controller.setRows(rows);
  harness.controller.onKey('MENU');
  return { ...harness, rows };
}

describe('guideControllerParts: sheet rows', () => {
  it('acts-then-resets for favorites, hide, external player and My list', async () => {
    const h = await withSheet();
    const { parts } = h.controller;
    parts.onSheetItem('Add to Favorites');
    expect(h.controller.layer).toEqual(GRID);
    await new Promise((r) => setTimeout(r, 20));
    expect((await h.channels.byId(h.rows[0]?.channel.id ?? 0))?.favorite).toBe(true);
    h.controller.onKey('MENU');
    parts.onSheetItem('Open in external player');
    expect(h.seams.openExternal).toHaveBeenCalled();
    h.controller.onKey('MENU');
    parts.onSheetItem('Add to My list');
    expect(h.seams.toggleMyList).toHaveBeenCalled();
    h.controller.onKey('MENU');
    parts.onSheetItem('Hide channel');
    await new Promise((r) => setTimeout(r, 20));
    expect((await h.channels.byId(h.rows[0]?.channel.id ?? 0))?.hidden).toBe(true);
    expect(h.controller.layer).toEqual(GRID);
  });
  it('pushes Search / Settings / Manage Favorites / Reorder channels after closing the sheet', async () => {
    const h = await withSheet();
    for (const item of ['Search', 'Settings', 'Manage Favorites', 'Reorder channels'] as const) {
      h.controller.onKey('MENU');
      h.controller.parts.onSheetItem(item);
      expect(h.controller.layer).toEqual(GRID);
    }
    expect(h.opened).toEqual([
      { kind: 'Search' },
      { kind: 'Settings' },
      { kind: 'ManageFavorites' },
      { kind: 'ReorderChannels', group: 'All channels' },
    ]);
  });
  it('opens the PIN dialog, the description, Channel options, group tools and coming-soon', async () => {
    const h = await withSheet();
    const { parts } = h.controller;
    parts.onSheetItem('Block channel');
    expect(h.controller.layer).toMatchObject({ kind: 'BlockPin', mode: 'Set a PIN', back: ROW_MENU });
    h.controller.menu.show(ROW_MENU);
    parts.onSheetItem('Program description');
    expect(h.controller.layer).toMatchObject({ kind: 'Description', title: 'Show' });
    h.controller.menu.show(ROW_MENU);
    parts.onSheetItem('Channel options');
    expect(h.controller.layer).toMatchObject({ kind: 'ChannelOptions', channelId: h.rows[0]?.channel.id });
    h.controller.menu.show(ROW_MENU);
    parts.onSheetItem('Create group');
    expect(h.controller.layer.kind).toBe('GroupTool');
    h.controller.menu.show(ROW_MENU);
    parts.onSheetItem('Record');
    expect(h.controller.layer).toMatchObject({ kind: 'ComingSoon', feature: 'Record', back: ROW_MENU });
    h.controller.engine.reset();
    parts.onSheetItem('Search');
    expect(h.opened).toEqual([]);
  });
});

describe('guideControllerParts: channel options, cell menu, PIN', () => {
  it('routes pane rows through the shared controller and the host effects', async () => {
    const h = await withSheet();
    const { parts } = h.controller;
    parts.onSheetItem('Channel options');
    parts.onChannelOption(OPTION.BLOCK);
    expect(h.controller.layer).toMatchObject({ kind: 'BlockPin', back: { kind: 'ChannelOptions' } });
    h.controller.menu.show({ kind: 'ChannelOptions', channelId: h.rows[1]?.channel.id ?? 0 });
    parts.onChannelOption(OPTION.NAMES_EDITOR);
    expect(h.controller.layer).toEqual(GRID);
    expect(h.opened).toEqual([{ kind: 'ChannelNamesEditor' }]);
    h.controller.menu.show({ kind: 'ChannelOptions', channelId: h.rows[1]?.channel.id ?? 0 });
    parts.onChannelOption(OPTION.HIDE);
    expect(h.controller.layer).toEqual(GRID);
    h.controller.menu.show({ kind: 'ChannelOptions', channelId: 999 });
    parts.onChannelOption(OPTION.HIDE);
    h.controller.menu.show(GRID);
    parts.onChannelOption(OPTION.HIDE);
  });
  it('submits the block and group PINs and reads the clock style', async () => {
    const h = await withSheet();
    const { parts, deps } = h.controller;
    parts.onSheetItem('Block channel');
    await parts.submitPin('1234');
    expect(h.controller.layer).toEqual(GRID);
    expect((await h.channels.byId(h.rows[0]?.channel.id ?? 0))?.blocked).toBe(true);
    deps.parental.setGroupLocked('Sports', true);
    h.controller.selectGroup('Sports');
    await parts.submitPin('0000');
    expect(h.controller.layer.kind).toBe('GroupPin');
    await parts.submitPin('1234');
    expect(h.controller.selectedGroup).toBe('Sports');
    expect(h.controller.layer).toEqual(GRID);
    await parts.submitPin('1234');
    expect(parts.clockStyle().is24h).toBe(false);
    deps.settings.set(TellySettings.CLOCK_FORMAT, '24-hour');
    expect(parts.clockStyle()).toEqual(CLOCK_24H);
    h.controller.setRows(h.rows);
    h.controller.onKey('LONG_OK');
    parts.onCellAction('Play channel');
    expect(h.fullscreen).toHaveBeenCalled();
    h.controller.onKey('LONG_OK');
    parts.onCellAction('Remind');
    expect(h.seams.toggleReminder).toHaveBeenCalled();
    h.controller.onKey('LONG_OK');
    parts.onCellAction('Program description');
    expect(h.controller.layer.kind).toBe('ComingSoon');
  });
});
