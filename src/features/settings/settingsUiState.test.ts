import { describe, expect, it } from 'vitest';
import {
  INITIAL_SETTINGS_STATE,
  activePane,
  consumesBack,
  paneKey,
  type SettingsPane,
} from './settingsUiState';

describe('SettingsUiState', () => {
  it('reports the active pane and whether BACK is consumed', () => {
    expect(activePane(INITIAL_SETTINGS_STATE)).toBeNull();
    expect(consumesBack(INITIAL_SETTINGS_STATE)).toBe(false);
    const pushed = { panes: [{ kind: 'Section', section: 'EPG' } as const], overlay: null };
    expect(activePane(pushed)).toEqual({ kind: 'Section', section: 'EPG' });
    expect(consumesBack(pushed)).toBe(true);
    expect(consumesBack({ panes: [], overlay: { kind: 'ConfirmClearHistory' } })).toBe(true);
  });

  it('keys every pane kind stably', () => {
    const panes: SettingsPane[] = [
      { kind: 'Section', section: 'GENERAL' },
      { kind: 'PlaylistDetail', url: 'http://p' },
      { kind: 'PlaylistGroups', url: 'http://p' },
      { kind: 'EpgSourceDetail', sourceId: 7 },
      { kind: 'Reminders' },
    ];
    expect(panes.map(paneKey)).toEqual([
      'Section:GENERAL',
      'PlaylistDetail:http://p',
      'PlaylistGroups:http://p',
      'EpgSourceDetail:7',
      'Reminders',
    ]);
    expect(paneKey(null)).toBe('root');
  });
});
