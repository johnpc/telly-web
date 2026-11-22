import { describe, expect, it } from 'vitest';
import {
  action,
  firstFocusableId,
  header,
  isLocked,
  markBusy,
  note,
  notSet,
  toggle,
  value,
} from './settingsRow';

describe('SettingsRow', () => {
  it('builds rows and derives ids for headers and notes', () => {
    expect(toggle('a', 'A', true)).toEqual({ kind: 'Toggle', id: 'a', title: 'A', checked: true });
    expect(toggle('a', 'A', false, 'sum').summary).toBe('sum');
    expect(value('v', 'V')).toEqual({ kind: 'Value', id: 'v', title: 'V' });
    expect(value('v', 'V', 'S', { checkIcon: true })).toMatchObject({ summary: 'S', checkIcon: true });
    expect(header('Update options').id).toBe('header:Update options');
    expect(note('n').accent).toBe(true);
    expect(note('n', false).accent).toBe(false);
    expect(notSet('  ')).toBe('Not set');
    expect(notSet('x')).toBe('x');
  });

  it('skips headers, notes and locked rows for the first focus and marks the busy action', () => {
    const rows = [header('h'), { ...toggle('l', 'L', false), locked: true }, action('go', 'Go'), note('n')];
    expect(firstFocusableId(rows)).toBe('go');
    expect(firstFocusableId([header('h')])).toBeNull();
    expect(rows.map(isLocked)).toEqual([false, true, false, false]);
    expect(markBusy(rows, 'go')[2]).toMatchObject({ busy: true });
    expect(markBusy(rows, null)).toEqual(rows);
  });
});
