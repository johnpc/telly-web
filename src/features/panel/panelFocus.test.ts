import { describe, expect, it } from 'vitest';
import {
  initialPanelFocus,
  openFocusedOn,
  pinDismissed,
  pinVerified,
  rowFocused,
  selectGroup,
} from './panelFocus';
import { ALL_CHANNELS } from './panelGroups';

describe('Panel focus', () => {
  it('starts browsing All channels at row 0 with no command issued', () => {
    expect(initialPanelFocus()).toMatchObject({
      mode: { kind: 'Browsing', group: ALL_CHANNELS, row: 0 },
      command: { version: 0, index: 0 },
    });
  });

  it('remembers the focus position per group and commands the list on every switch', () => {
    let s = rowFocused(initialPanelFocus(), 2);
    s = selectGroup(s, 'Sports', false);
    expect(s.mode).toEqual({ kind: 'Browsing', group: 'Sports', row: 0 });
    expect(s.command).toEqual({ version: 1, index: 0 });
    s = rowFocused(s, 1);
    s = selectGroup(s, ALL_CHANNELS, false);
    expect(s.mode).toMatchObject({ group: ALL_CHANNELS, row: 2 });
    expect(s.command).toEqual({ version: 2, index: 2 });
    s = selectGroup(s, 'Sports', false);
    expect(s.mode).toMatchObject({ group: 'Sports', row: 1 });
    expect(s.command).toEqual({ version: 3, index: 1 });
  });

  it('reselecting the current group keeps the focus position and issues nothing', () => {
    const s = rowFocused(initialPanelFocus(), 3);
    expect(selectGroup(s, ALL_CHANNELS, false)).toBe(s);
    expect(rowFocused(s, 3)).toBe(s);
  });

  it('a locked group prompts for the PIN instead of switching; the verified PIN releases it', () => {
    const prompted = selectGroup(rowFocused(initialPanelFocus(), 4), 'Music', true);
    expect(prompted.mode).toEqual({ kind: 'PinPrompt', group: ALL_CHANNELS, row: 4, pending: 'Music' });
    expect(prompted.command.version).toBe(0);
    const unlocked = pinVerified(prompted);
    expect(unlocked.mode).toEqual({ kind: 'Browsing', group: 'Music', row: 0 });
    expect(unlocked.command).toEqual({ version: 1, index: 0 });
    expect(pinVerified(unlocked)).toBe(unlocked);
  });

  it('dismissing the prompt keeps the previous group and row', () => {
    const prompted = selectGroup(rowFocused(initialPanelFocus(), 4), 'Music', true);
    expect(pinDismissed(prompted).mode).toEqual({ kind: 'Browsing', group: ALL_CHANNELS, row: 4 });
  });

  it('opening focused on a channel of the selected group commands that row', () => {
    const s = openFocusedOn(selectGroup(initialPanelFocus(), 'Sports', false), 1, 3);
    expect(s.mode).toMatchObject({ group: 'Sports', row: 1 });
    expect(s.command).toEqual({ version: 2, index: 1 });
  });

  it('opening focused on a channel outside the group falls back to All channels', () => {
    const s = openFocusedOn(selectGroup(initialPanelFocus(), 'Sports', false), -1, 7);
    expect(s.mode).toEqual({ kind: 'Browsing', group: ALL_CHANNELS, row: 7 });
    expect(s.command).toEqual({ version: 2, index: 7 });
    expect(openFocusedOn(initialPanelFocus(), -1, -1).command).toEqual({ version: 1, index: 0 });
  });
});
