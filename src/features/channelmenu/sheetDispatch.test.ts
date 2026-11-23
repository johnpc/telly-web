import { describe, expect, it, vi } from 'vitest';
import { channel } from '@/features/guide/testFixtures';
import type { ChannelOptionsController } from './channelOptionsController';
import type { SheetFlagActions } from './sheetActions';
import { type SheetHost, runChannelOption, runSheetItem } from './sheetDispatch';
import { SHEET_ITEMS } from './sheetMenu';

function make() {
  const host: SheetHost = {
    actThenReset: vi.fn((action: () => void) => action()),
    open: vi.fn(),
    selectedGroup: () => 'Sports',
    pushBlockPin: vi.fn(),
    pushDescription: vi.fn(),
    showChannelOptions: vi.fn(),
    openGroupTool: vi.fn(),
    record: vi.fn(),
    customRecording: vi.fn(),
    toggleMyList: vi.fn(),
    openExternal: vi.fn(),
  };
  const actions = {
    toggleFavorite: vi.fn(async () => 1),
    hide: vi.fn(async () => 1),
    blockMode: vi.fn(() => 'Enter PIN' as const),
  } as unknown as SheetFlagActions;
  return { host, actions };
}

describe('runSheetItem', () => {
  it('runs every row through its route', () => {
    const { host, actions } = make();
    const ch = channel(1);
    for (const item of SHEET_ITEMS) runSheetItem(host, actions, item, ch);
    expect(vi.mocked(host.open).mock.calls.map(([route]) => route)).toEqual([
      { kind: 'Search' },
      { kind: 'Settings' },
      { kind: 'ManageFavorites' },
      { kind: 'ReorderChannels', group: 'Sports' },
    ]);
    expect(actions.toggleFavorite).toHaveBeenCalledWith(ch);
    expect(actions.hide).toHaveBeenCalledWith(ch);
    expect(host.openExternal).toHaveBeenCalledWith(ch);
    expect(host.toggleMyList).toHaveBeenCalledWith(ch);
    expect(host.actThenReset).toHaveBeenCalledTimes(4);
    expect(host.pushBlockPin).toHaveBeenCalledWith(ch, 'Enter PIN');
    expect(host.pushDescription).toHaveBeenCalledWith(ch);
    expect(host.showChannelOptions).toHaveBeenCalledWith(ch);
    expect(host.record).toHaveBeenCalledWith(ch);
    expect(host.customRecording).toHaveBeenCalledWith(ch);
    expect(vi.mocked(host.openGroupTool).mock.calls.map(([item]) => item)).toEqual([
      'Assign EPG',
      'Manage blocking',
      'Manage visibility',
      'Copy channels',
      'Create group',
      'Group options',
    ]);
  });
});

describe('runChannelOption', () => {
  it('finishes the pane effects through the sheet flows', () => {
    const { host, actions } = make();
    const ch = channel(2);
    const effects = ['BLOCK', 'HIDE', 'NAMES_EDITOR', null] as const;
    let index = 0;
    const options = { onRow: vi.fn(() => effects[index++] ?? null) } as unknown as ChannelOptionsController;
    for (const rowId of ['block', 'hide', 'names', 'other'])
      runChannelOption(host, actions, options, ch, rowId);
    expect(host.pushBlockPin).toHaveBeenCalledWith(ch, 'Enter PIN');
    expect(actions.hide).toHaveBeenCalledWith(ch);
    expect(host.open).toHaveBeenCalledWith({ kind: 'ChannelNamesEditor' });
    expect(options.onRow).toHaveBeenCalledTimes(4);
  });
});
