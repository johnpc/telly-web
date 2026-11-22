import { describe, expect, it } from 'vitest';
import {
  groupIdOf,
  indexOfChannel,
  initialsOf,
  lockedGroupsOf,
  logoBackground,
  rowIdOf,
  rowIndexOf,
  scrimAlpha,
  wrapIndexFor,
  wrapTargetFor,
} from './panelKeys';
import { buildRows } from './panelRows';
import { testChannel } from './testChannels';

const rows = buildRows([testChannel(3, 'A', 'G'), testChannel(12, 'B', 'G')], 'G', new Map(), 0, {
  is24h: false,
});

describe('panelKeys', () => {
  it('wraps DOWN at the last row and UP at the first, never on a single row', () => {
    expect(wrapIndexFor('DOWN', 4, 4)).toBe(0);
    expect(wrapIndexFor('UP', 0, 4)).toBe(4);
    expect(wrapIndexFor('DOWN', 2, 4)).toBeNull();
    expect(wrapIndexFor('UP', 2, 4)).toBeNull();
    expect(wrapIndexFor('LEFT', 0, 4)).toBeNull();
    expect(wrapIndexFor('DOWN', 0, 0)).toBeNull();
  });

  it('resolves the wrap target row and channel indexes', () => {
    expect(wrapTargetFor('DOWN', rows, 1)?.channel.id).toBe(3);
    expect(wrapTargetFor('UP', rows, 0)?.channel.id).toBe(12);
    expect(wrapTargetFor('DOWN', rows, 0)).toBeNull();
    expect(
      indexOfChannel(
        rows.map((r) => r.channel),
        12,
      ),
    ).toBe(1);
    expect(
      indexOfChannel(
        rows.map((r) => r.channel),
        99,
      ),
    ).toBe(-1);
    expect(
      indexOfChannel(
        rows.map((r) => r.channel),
        null,
      ),
    ).toBe(-1);
  });

  it('maps focus ids to rows and back', () => {
    expect(rowIdOf(12)).toBe('panel-row-12');
    expect(groupIdOf('All channels')).toBe('panel-group-All channels');
    expect(rowIndexOf('panel-row-12', rows)).toBe(1);
    expect(rowIndexOf('panel-row-99', rows)).toBe(-1);
    expect(rowIndexOf('panel-group-News', rows)).toBe(-1);
    expect(rowIndexOf(null, rows)).toBe(-1);
  });

  it('scales the scrim by the extra transparency', () => {
    expect(scrimAlpha(0)).toBeCloseTo(0.68);
    expect(scrimAlpha(50)).toBeCloseTo(0.34);
    expect(scrimAlpha(100)).toBe(0);
  });

  it('resolves the logo background label', () => {
    expect(logoBackground('Default')).toBe('#2c5f8a');
    expect(logoBackground('Transparent')).toBe('transparent');
    expect(logoBackground('Dark')).toBe('#262d38');
    expect(logoBackground('Light')).toBe('#e0e2e4');
  });

  it('builds logo initials from the first two words', () => {
    expect(initialsOf('News One HD')).toBe('NO');
    expect(initialsOf('  sports ')).toBe('S');
    expect(initialsOf('')).toBe('');
  });

  it('locks groups only while parental controls gate groups', () => {
    const groups = ['Favorites', 'Music', 'Kids'];
    const locked = new Set(['Music', 'Movies']);
    expect([...lockedGroupsOf(groups, true, false, locked)]).toEqual(['Music']);
    expect(lockedGroupsOf(groups, false, false, locked).size).toBe(0);
    expect(lockedGroupsOf(groups, true, true, locked).size).toBe(0);
  });
});
